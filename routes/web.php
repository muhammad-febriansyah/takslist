<?php

use App\Http\Controllers\Admin\BulkDeleteUsersController;
use App\Http\Controllers\Admin\MonitoringController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\BulkDeleteTasksController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OsticketTaskController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskReorderController;
use App\Http\Controllers\TaskReviewController;
use App\Http\Controllers\TimesheetExportController;
use App\Http\Controllers\TimesheetSubmissionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('admin', MonitoringController::class)->name('admin.monitoring');
    Route::get('admin/users', [UserController::class, 'index'])->name('admin.users.index');
    Route::post('admin/users', [UserController::class, 'store'])->name('admin.users.store');
    Route::delete('admin/users/bulk', BulkDeleteUsersController::class)->name('admin.users.bulk-destroy');
    Route::put('admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
    Route::delete('admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
    Route::get('reviews', [TaskReviewController::class, 'index'])->name('reviews.index');
    Route::post('reviews/submit-period', [TaskReviewController::class, 'storeForPeriod'])->name('reviews.submit-period');
    Route::post('reviews/bulk-approve', [TaskReviewController::class, 'bulkApprove'])->name('reviews.bulk-approve');
    Route::get('reviews/{review}/signature', [TaskReviewController::class, 'signature'])->name('reviews.signature');

    Route::patch('tasks/reorder', TaskReorderController::class)->name('tasks.reorder');
    Route::delete('tasks/bulk', BulkDeleteTasksController::class)->name('tasks.bulk-destroy');
    Route::resource('tasks', TaskController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('tasks/osticket/preview', [OsticketTaskController::class, 'preview'])->name('tasks.osticket.preview');
    Route::post('tasks/osticket/import', [OsticketTaskController::class, 'import'])->name('tasks.osticket.import');
    Route::post('tasks/{task}/review', [TaskReviewController::class, 'store'])->name('tasks.review.store');
    Route::patch('reviews/{review}', [TaskReviewController::class, 'update'])->name('reviews.update');
    Route::post('tasks/export/timesheet', TimesheetExportController::class)->name('tasks.export.timesheet');
    Route::post('tasks/timesheet-submissions', [TimesheetSubmissionController::class, 'store'])->name('tasks.timesheet-submissions.store');
    Route::patch('notifications/{notification}/read', NotificationController::class)->name('notifications.read');

    Route::get('calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::post('calendar/events', [CalendarController::class, 'store'])->name('calendar.events.store');
});

require __DIR__.'/settings.php';
