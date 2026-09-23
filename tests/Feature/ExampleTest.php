<?php

test('redirects the root page to login', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});
