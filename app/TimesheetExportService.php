<?php

namespace App;

use App\Models\Task;
use App\Models\TaskReview;
use App\Models\TimesheetSubmission;
use App\Models\User;
use DateTimeImmutable;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use ZipArchive;

class TimesheetExportService
{
    private const MAIN_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';

    private const OFFICE_RELATIONSHIPS_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    private const CONTENT_TYPES_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/content-types';

    /**
     * Generate a timesheet workbook from preserved Excel template.
     *
     * @param  array{department: string, client?: ?string, approved_by: string, approved_role?: ?string, period: string, signature_data: string, supervisor_signature_data?: ?string}  $options
     */
    public function generate(User $user, array $options): string
    {
        $period = DateTimeImmutable::createFromFormat('!Y-m', $options['period']);

        if ($period === false) {
            throw new RuntimeException('Periode timesheet tidak valid.');
        }

        $firstDay = $period->modify('first day of this month');
        $lastDay = $period->modify('last day of this month');
        $tasksByDate = Task::ownedBy($user)
            ->whereBetween('due_date', [$firstDay->format('Y-m-d'), $lastDay->format('Y-m-d')])
            ->orderBy('due_date')
            ->orderBy('sort_order')
            ->get(['due_date', 'title', 'description', 'external_ticket_number'])
            ->groupBy(fn (Task $task): string => $task->due_date?->format('Y-m-d') ?? '');

        $fromTime = 8 / 24;
        $toTime = 17 / 24;
        $workHours = $toTime - $fromTime - (1 / 24);
        $templatePath = resource_path('templates/timesheet-template.xlsx');

        if (! is_file($templatePath)) {
            throw new RuntimeException('Template timesheet tidak ditemukan.');
        }

        $temporaryPath = tempnam(storage_path('app'), 'timesheet_');

        if ($temporaryPath === false) {
            throw new RuntimeException('File export timesheet tidak dapat dibuat.');
        }

        unlink($temporaryPath);
        $outputPath = $temporaryPath.'.xlsx';

        if (! copy($templatePath, $outputPath)) {
            throw new RuntimeException('Template timesheet tidak dapat disalin.');
        }

        $zip = new ZipArchive;

        if ($zip->open($outputPath) !== true) {
            throw new RuntimeException('File export timesheet tidak dapat dibuka.');
        }

        try {
            $sheet = $this->loadXml($zip->getFromName('xl/worksheets/sheet1.xml'));
            $sheetXPath = $this->xpath($sheet);
            $redDateStyle = $this->createRedDateStyle($zip, $sheetXPath);

            $this->setInlineString($sheet, $sheetXPath, 'C4', $user->name);
            $this->setInlineString($sheet, $sheetXPath, 'C5', $options['department']);
            $this->setInlineString($sheet, $sheetXPath, 'C6', $options['client'] ?: 'SIM');
            $this->setInlineString($sheet, $sheetXPath, 'C7', $period->format('F'));
            $this->setCellNumber($sheet, $sheetXPath, 'C8', $workHours);
            $this->setInlineString($sheet, $sheetXPath, 'B43', $this->formatIndonesianDate(new DateTimeImmutable('now')));
            $this->setInlineString($sheet, $sheetXPath, 'A48', $user->name);
            $this->setInlineString($sheet, $sheetXPath, 'A49', "({$options['department']})");
            $this->setInlineString($sheet, $sheetXPath, 'G48', $options['approved_by']);
            $this->setInlineString($sheet, $sheetXPath, 'G49', $options['approved_role'] ? "({$options['approved_role']})" : '');

            $daysInMonth = (int) $lastDay->format('j');

            for ($day = 1; $day <= 31; $day++) {
                $row = 11 + $day;

                if ($day > $daysInMonth) {
                    foreach (['A', 'C', 'D', 'E', 'F', 'G'] as $column) {
                        $this->clearCell($sheetXPath, $column.$row);
                    }

                    continue;
                }

                $date = $firstDay->setDate(
                    (int) $firstDay->format('Y'),
                    (int) $firstDay->format('m'),
                    $day,
                );
                $dayTasks = $tasksByDate->get($date->format('Y-m-d'), collect());
                $description = $dayTasks
                    ->map(fn (Task $task): string => $this->formatTaskDescription($task))
                    ->implode("\n\n");

                $this->setCellNumber($sheet, $sheetXPath, 'A'.$row, $this->excelDateSerial($date));

                if ($this->isRedDate($date)) {
                    $this->clearCell($sheetXPath, 'C'.$row);
                    $this->clearCell($sheetXPath, 'D'.$row);
                    $this->clearCell($sheetXPath, 'E'.$row);
                    $this->clearCell($sheetXPath, 'F'.$row);
                    $this->setCellStyle($sheetXPath, 'A'.$row, $redDateStyle);
                    $this->setInlineString($sheet, $sheetXPath, 'G'.$row, $description);
                    $this->setDescriptionRowHeight($sheetXPath, $row, $description);

                    continue;
                }

                $this->setCellNumber($sheet, $sheetXPath, 'C'.$row, $fromTime);
                $this->setCellNumber($sheet, $sheetXPath, 'D'.$row, $toTime);
                $this->setCellFormula($sheet, $sheetXPath, 'E'.$row, "D{$row}-C{$row}-TIME(1,0,0)", $workHours);
                $this->setCellFormula($sheet, $sheetXPath, 'F'.$row, "\$C\$8-C{$row}", 0);
                $this->setInlineString($sheet, $sheetXPath, 'G'.$row, $description);
                $this->setDescriptionRowHeight($sheetXPath, $row, $description);
            }

            $workbook = $this->loadXml($zip->getFromName('xl/workbook.xml'));
            $workbookXPath = $this->xpath($workbook);
            $sheetNode = $workbookXPath->query('//main:sheets/main:sheet')->item(0);

            if ($sheetNode instanceof DOMElement) {
                $sheetNode->setAttribute('name', $period->format('F Y'));
            }

            $calcPr = $workbookXPath->query('//main:calcPr')->item(0);

            if ($calcPr instanceof DOMElement) {
                $calcPr->setAttribute('calcMode', 'auto');
                $calcPr->setAttribute('fullCalcOnLoad', '1');
                $calcPr->setAttribute('forceFullCalc', '1');
            }

            $this->removeCalculationChain($zip);
            $this->addSignatureImages(
                $zip,
                $sheet,
                $options['signature_data'],
                $options['supervisor_signature_data'] ?? null,
            );

            $zip->addFromString('xl/worksheets/sheet1.xml', $sheet->saveXML());
            $zip->addFromString('xl/workbook.xml', $workbook->saveXML());
        } catch (\Throwable $exception) {
            $zip->close();
            @unlink($outputPath);

            throw $exception;
        }

        $zip->close();

        return $outputPath;
    }

    public function canExportForPeriod(User $user, string $period): bool
    {
        return $this->statusForSubmission($user, $period) === 'approved';
    }

    public function syncSubmissionStatus(TimesheetSubmission $submission): void
    {
        $submission->loadMissing('user');
        $submission->update(['status' => $this->statusForSubmission($submission->user, $submission->period)]);
    }

    public function statusForSubmission(User $user, string $period): string
    {
        $periodDate = DateTimeImmutable::createFromFormat('!Y-m', $period);

        if ($periodDate === false) {
            return 'pending';
        }

        $firstDay = $periodDate->modify('first day of this month');
        $lastDay = $periodDate->modify('last day of this month');
        $tasks = Task::ownedBy($user)
            ->whereBetween('due_date', [$firstDay->format('Y-m-d'), $lastDay->format('Y-m-d')])
            ->whereHas('reviews')
            ->with('latestReview')
            ->get(['id']);

        if ($tasks->contains(fn (Task $task): bool => $task->latestReview?->status === 'rejected')) {
            return 'rejected';
        }

        if ($tasks->isNotEmpty() && $tasks->every(fn (Task $task): bool => $task->latestReview?->status === 'approved'
            && $task->latestReview->signature_path !== null
            && Storage::disk('public')->exists($task->latestReview->signature_path))) {
            return 'approved';
        }

        return 'pending';
    }

    public function syncSubmissionForTask(Task $task): void
    {
        if ($task->due_date === null) {
            return;
        }

        $submission = TimesheetSubmission::query()
            ->where('user_id', $task->user_id)
            ->where('period', $task->due_date->format('Y-m'))
            ->first();

        if ($submission !== null) {
            $this->syncSubmissionStatus($submission);
        }
    }

    public function signatureDataForPeriod(User $user, string $period): ?string
    {
        $periodDate = DateTimeImmutable::createFromFormat('!Y-m', $period);

        if ($periodDate === false) {
            return null;
        }

        $firstDay = $periodDate->modify('first day of this month');
        $lastDay = $periodDate->modify('last day of this month');
        $review = Task::ownedBy($user)
            ->whereBetween('due_date', [$firstDay->format('Y-m-d'), $lastDay->format('Y-m-d')])
            ->with('latestReview')
            ->get(['id'])
            ->map(fn (Task $task): ?TaskReview => $task->latestReview)
            ->filter(fn (?TaskReview $taskReview): bool => $taskReview?->status === 'approved'
                && $taskReview->signature_path !== null)
            ->first();

        if ($review?->signature_path === null || ! Storage::disk('public')->exists($review->signature_path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(Storage::disk('public')->get($review->signature_path));
    }

    public function signatureDataForSubmission(User $user, string $period): ?string
    {
        $submission = TimesheetSubmission::query()
            ->where('user_id', $user->id)
            ->where('period', $period)
            ->first(['signature_path']);

        if ($submission?->signature_path === null || ! Storage::disk('public')->exists($submission->signature_path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(Storage::disk('public')->get($submission->signature_path));
    }

    private function formatIndonesianDate(DateTimeImmutable $date): string
    {
        $months = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];

        return $date->format('j').' '.$months[(int) $date->format('n')].' '.$date->format('Y');
    }

    private function isRedDate(DateTimeImmutable $date): bool
    {
        return (int) $date->format('N') >= 6;
    }

    private function loadXml(string|false $xml): DOMDocument
    {
        if ($xml === false) {
            throw new RuntimeException('Bagian template timesheet tidak ditemukan.');
        }

        $document = new DOMDocument;
        $document->preserveWhiteSpace = true;
        $document->formatOutput = false;

        if (! $document->loadXML($xml)) {
            throw new RuntimeException('XML template timesheet tidak valid.');
        }

        return $document;
    }

    private function xpath(DOMDocument $document): DOMXPath
    {
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('main', self::MAIN_NAMESPACE);

        return $xpath;
    }

    private function formatTaskDescription(Task $task): string
    {
        $description = trim((string) ($task->description ?? ''));

        if (preg_match('/(?:^|\R)Deskripsi:\s*(?<description>.*)\z/su', $description, $matches) === 1) {
            $description = trim($matches['description']);
        }

        return implode("\n", [
            '• No tiket: '.($task->external_ticket_number ? '#'.$task->external_ticket_number : '-'),
            '  Title: '.$task->title,
            '  Deskripsi: '.($description !== '' ? $description : '-'),
        ]);
    }

    private function setCellStyle(DOMXPath $xpath, string $reference, int $styleIndex): void
    {
        $this->cell($xpath, $reference)->setAttribute('s', (string) $styleIndex);
    }

    private function setDescriptionRowHeight(DOMXPath $xpath, int $rowNumber, string $description): void
    {
        $row = $xpath->query('//main:row[@r="'.$rowNumber.'"]')->item(0);

        if (! $row instanceof DOMElement) {
            return;
        }

        $lineCount = 1;

        foreach (explode("\n", $description) as $line) {
            $length = function_exists('mb_strlen') ? mb_strlen($line) : strlen($line);
            $lineCount += max(1, (int) ceil($length / 100));
        }

        $row->setAttribute('ht', (string) min(300, max(16, ($lineCount * 15) + 4)));
        $row->setAttribute('customHeight', '1');
    }

    private function createRedDateStyle(ZipArchive $zip, DOMXPath $sheetXPath): int
    {
        $styles = $this->loadXml($zip->getFromName('xl/styles.xml'));
        $stylesXPath = $this->xpath($styles);
        $fonts = $stylesXPath->query('//main:fonts')->item(0);
        $cellXfs = $stylesXPath->query('//main:cellXfs')->item(0);
        $dateCell = $this->cell($sheetXPath, 'A12');

        if (! $fonts instanceof DOMElement || ! $cellXfs instanceof DOMElement) {
            throw new RuntimeException('Struktur style template timesheet tidak valid.');
        }

        $dateStyleIndex = (int) $dateCell->getAttribute('s');
        $cellXfNodes = $stylesXPath->query('//main:cellXfs/main:xf');
        $fontNodes = $stylesXPath->query('//main:fonts/main:font');
        $dateStyle = $cellXfNodes->item($dateStyleIndex);
        $fontCount = $fontNodes->length;
        $styleCount = $cellXfNodes->length;

        if (! $dateStyle instanceof DOMElement) {
            throw new RuntimeException('Style tanggal template timesheet tidak ditemukan.');
        }

        $redFont = $fontNodes->item((int) $dateStyle->getAttribute('fontId'));

        if (! $redFont instanceof DOMElement) {
            throw new RuntimeException('Font tanggal template timesheet tidak ditemukan.');
        }

        $redFont = $redFont->cloneNode(true);
        $fontColor = null;

        foreach ($redFont->childNodes as $child) {
            if ($child instanceof DOMElement && $child->localName === 'color') {
                $fontColor = $child;
                break;
            }
        }

        if (! $fontColor instanceof DOMElement) {
            $fontColor = $styles->createElementNS(self::MAIN_NAMESPACE, 'color');
            $redFont->appendChild($fontColor);
        }

        $fontColor->removeAttribute('theme');
        $fontColor->setAttribute('rgb', 'FFFF0000');
        $fonts->appendChild($redFont);
        $fontIndex = $fontCount;

        $redStyle = $dateStyle->cloneNode(true);
        $redStyle->setAttribute('fontId', (string) $fontIndex);
        $redStyle->setAttribute('applyFont', '1');
        $cellXfs->appendChild($redStyle);
        $styleIndex = $styleCount;
        $fonts->setAttribute('count', (string) ($fontCount + 1));
        $cellXfs->setAttribute('count', (string) ($styleCount + 1));
        $zip->addFromString('xl/styles.xml', $styles->saveXML());

        return $styleIndex;
    }

    private function removeCalculationChain(ZipArchive $zip): void
    {
        $workbookRelationships = $this->loadXml($zip->getFromName('xl/_rels/workbook.xml.rels'));
        $workbookRelationshipsXPath = new DOMXPath($workbookRelationships);
        $workbookRelationshipsXPath->registerNamespace('rel', self::RELATIONSHIPS_NAMESPACE);

        foreach ($workbookRelationshipsXPath->query('//rel:Relationship[contains(@Type, "/calcChain")]') as $relationship) {
            $relationship->parentNode?->removeChild($relationship);
        }

        $contentTypes = $this->loadXml($zip->getFromName('[Content_Types].xml'));
        $contentTypesXPath = new DOMXPath($contentTypes);
        $contentTypesXPath->registerNamespace('content', self::CONTENT_TYPES_NAMESPACE);

        foreach ($contentTypesXPath->query('//content:Override[@PartName="/xl/calcChain.xml"]') as $override) {
            $override->parentNode?->removeChild($override);
        }

        $zip->deleteName('xl/calcChain.xml');
        $zip->addFromString('xl/_rels/workbook.xml.rels', $workbookRelationships->saveXML());
        $zip->addFromString('[Content_Types].xml', $contentTypes->saveXML());
    }

    private function cell(DOMXPath $xpath, string $reference): DOMElement
    {
        $cell = $xpath->query(sprintf('//main:c[@r="%s"]', $reference))->item(0);

        if (! $cell instanceof DOMElement) {
            throw new RuntimeException("Sel {$reference} tidak ditemukan di template timesheet.");
        }

        return $cell;
    }

    private function resetCell(DOMElement $cell): void
    {
        while ($cell->firstChild !== null) {
            $cell->removeChild($cell->firstChild);
        }

        $cell->removeAttribute('t');
    }

    private function clearCell(DOMXPath $xpath, string $reference): void
    {
        $this->resetCell($this->cell($xpath, $reference));
    }

    private function setInlineString(DOMDocument $document, DOMXPath $xpath, string $reference, string $value): void
    {
        $cell = $this->cell($xpath, $reference);
        $this->resetCell($cell);
        $cell->setAttribute('t', 'inlineStr');

        $inlineString = $document->createElementNS(self::MAIN_NAMESPACE, 'is');
        $text = $document->createElementNS(self::MAIN_NAMESPACE, 't');

        if ($value !== trim($value)) {
            $text->setAttribute('xml:space', 'preserve');
        }

        $text->appendChild($document->createTextNode($value));
        $inlineString->appendChild($text);
        $cell->appendChild($inlineString);
    }

    private function setCellNumber(DOMDocument $document, DOMXPath $xpath, string $reference, float|int $value): void
    {
        $cell = $this->cell($xpath, $reference);
        $this->resetCell($cell);
        $cell->appendChild($document->createElementNS(self::MAIN_NAMESPACE, 'v', (string) $value));
    }

    private function setCellFormula(DOMDocument $document, DOMXPath $xpath, string $reference, string $formula, float|int $cachedValue): void
    {
        $cell = $this->cell($xpath, $reference);
        $this->resetCell($cell);
        $cell->appendChild($document->createElementNS(self::MAIN_NAMESPACE, 'f', $formula));
        $cell->appendChild($document->createElementNS(self::MAIN_NAMESPACE, 'v', (string) $cachedValue));
    }

    private function addSignatureImages(
        ZipArchive $zip,
        DOMDocument $sheet,
        string $creatorDataUri,
        ?string $supervisorDataUri,
    ): void {
        $images = [
            'creator' => $this->signatureImage($creatorDataUri),
        ];

        if ($supervisorDataUri !== null && $supervisorDataUri !== '') {
            $images['supervisor'] = $this->signatureImage($supervisorDataUri);
        }

        $anchors = [];
        $relationships = [];
        $positions = [
            'creator' => [1, 4],
            'supervisor' => [5, 7],
        ];
        $pictureId = 2;
        $relationshipId = 1;

        foreach ($images as $name => $image) {
            [$fromColumn, $toColumn] = $positions[$name];
            $anchors[] = $this->signatureAnchor(
                $fromColumn,
                $toColumn,
                $relationshipId,
                $pictureId,
                $name === 'creator' ? 'Created By Signature' : 'Approved By Signature',
            );
            $relationships[] = sprintf(
                '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/signature-%s.png"/>',
                $relationshipId,
                $name,
            );
            $zip->addFromString('xl/media/signature-'.$name.'.png', $image);
            $pictureId++;
            $relationshipId++;
        }

        $drawing = new DOMDocument;
        $drawing->loadXML(sprintf(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">%s</xdr:wsDr>',
            implode('', $anchors),
        ));

        $drawingRelationships = sprintf(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">%s</Relationships>',
            implode('', $relationships),
        );
        $sheetRelationships = <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>
XML;

        $drawingNode = $sheet->createElementNS(self::MAIN_NAMESPACE, 'drawing');
        $drawingNode->setAttributeNS(self::OFFICE_RELATIONSHIPS_NAMESPACE, 'r:id', 'rId1');
        $sheet->documentElement?->appendChild($drawingNode);

        $contentTypes = $this->loadXml($zip->getFromName('[Content_Types].xml'));
        $contentRoot = $contentTypes->documentElement;

        if ($contentRoot === null) {
            throw new RuntimeException('Struktur content types template tidak valid.');
        }

        $hasPng = false;
        $hasDrawing = false;

        foreach ($contentRoot->childNodes as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            $hasPng = $hasPng || $child->getAttribute('Extension') === 'png';
            $hasDrawing = $hasDrawing || $child->getAttribute('PartName') === '/xl/drawings/drawing1.xml';
        }

        if (! $hasPng) {
            $pngType = $contentTypes->createElementNS(self::CONTENT_TYPES_NAMESPACE, 'Default');
            $pngType->setAttribute('Extension', 'png');
            $pngType->setAttribute('ContentType', 'image/png');
            $contentRoot->appendChild($pngType);
        }

        if (! $hasDrawing) {
            $drawingType = $contentTypes->createElementNS(self::CONTENT_TYPES_NAMESPACE, 'Override');
            $drawingType->setAttribute('PartName', '/xl/drawings/drawing1.xml');
            $drawingType->setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.drawing+xml');
            $contentRoot->appendChild($drawingType);
        }

        $zip->addFromString('xl/drawings/drawing1.xml', $drawing->saveXML());
        $zip->addFromString('xl/drawings/_rels/drawing1.xml.rels', $drawingRelationships);
        $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels', $sheetRelationships);
        $zip->addFromString('[Content_Types].xml', $contentTypes->saveXML());
    }

    private function signatureImage(string $dataUri): string
    {
        if (preg_match('/^data:image\/png;base64,(?<data>[A-Za-z0-9+\/=]+)$/', $dataUri, $matches) !== 1) {
            throw new RuntimeException('Format tanda tangan tidak valid.');
        }

        $image = base64_decode($matches['data'], true);

        if ($image === false || ! str_starts_with($image, "\x89PNG\r\n\x1a\n")) {
            throw new RuntimeException('Data tanda tangan tidak valid.');
        }

        return $this->trimTransparentPadding($image);
    }

    private function signatureAnchor(
        int $fromColumn,
        int $toColumn,
        int $relationshipId,
        int $pictureId,
        string $name,
    ): string {
        return sprintf(
            '<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>%d</xdr:col><xdr:colOff>120000</xdr:colOff><xdr:row>44</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>%d</xdr:col><xdr:colOff>120000</xdr:colOff><xdr:row>47</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="%d" name="%s"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId%d"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>',
            $fromColumn,
            $toColumn,
            $pictureId,
            htmlspecialchars($name, ENT_XML1),
            $relationshipId,
        );
    }

    private function trimTransparentPadding(string $image): string
    {
        $source = @imagecreatefromstring($image);

        if ($source === false) {
            return $image;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $minX = $width;
        $minY = $height;
        $maxX = -1;
        $maxY = -1;

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $rgba = imagecolorat($source, $x, $y);
                $alpha = imagecolorsforindex($source, $rgba)['alpha'];

                if ($alpha >= 127) {
                    continue;
                }

                $minX = min($minX, $x);
                $minY = min($minY, $y);
                $maxX = max($maxX, $x);
                $maxY = max($maxY, $y);
            }
        }

        if ($maxX < 0 || $maxY < 0) {
            imagedestroy($source);

            return $image;
        }

        $padding = 12;
        $cropX = max(0, $minX - $padding);
        $cropY = max(0, $minY - $padding);
        $cropWidth = min($width - $cropX, $maxX - $minX + ($padding * 2) + 1);
        $cropHeight = min($height - $cropY, $maxY - $minY + ($padding * 2) + 1);
        $cropped = imagecreatetruecolor($cropWidth, $cropHeight);

        imagealphablending($cropped, false);
        imagesavealpha($cropped, true);
        imagefill($cropped, 0, 0, imagecolorallocatealpha($cropped, 0, 0, 0, 127));
        imagecopy($cropped, $source, 0, 0, $cropX, $cropY, $cropWidth, $cropHeight);

        ob_start();
        imagepng($cropped, null, 6);
        $croppedImage = ob_get_clean();
        imagedestroy($cropped);
        imagedestroy($source);

        return is_string($croppedImage) && $croppedImage !== '' ? $croppedImage : $image;
    }

    private function excelDateSerial(DateTimeImmutable $date): int
    {
        return (int) (new DateTimeImmutable('1899-12-30'))->diff($date)->days;
    }
}
