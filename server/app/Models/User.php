<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $guarded = ['id'];

    protected $hidden = ['password', 'remember_token', 'google_refresh_token', 'google_access_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_default' => 'boolean',
            'google_refresh_token' => 'encrypted',
            'google_access_token' => 'encrypted',
            'google_token_expires_at' => 'datetime',
            'last_backup_at' => 'datetime',
        ];
    }

    public function isGoogle(): bool
    {
        return !$this->is_default && !empty($this->google_refresh_token);
    }
}
