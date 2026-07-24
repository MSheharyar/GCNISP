<?php

namespace App\Models\Concerns;

use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;

/**
 * Scopes a model to the current dealer (tenant): every query is filtered by
 * dealer_id, and new records inherit the current dealer automatically. When no
 * tenant is set (e.g. the super-admin console), no filter is applied.
 */
trait BelongsToDealer
{
    protected static function bootBelongsToDealer(): void
    {
        static::addGlobalScope('dealer', function (Builder $builder) {
            if (Tenant::check()) {
                $model = $builder->getModel();
                $builder->where($model->getTable().'.'.'dealer_id', Tenant::id());
            }
        });

        static::creating(function ($model) {
            if (Tenant::check() && empty($model->dealer_id)) {
                $model->dealer_id = Tenant::id();
            }
        });
    }

    public function dealer()
    {
        return $this->belongsTo(\App\Models\Dealer::class);
    }
}
