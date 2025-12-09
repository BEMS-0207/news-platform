<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware
{
    protected $limiter;

    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    public function handle($request, Closure $next, $key = 'default', $maxAttempts = 60, $decayMinutes = 1)
    {
        $fullKey = $key . ':' . $request->ip();

        if ($this->limiter->tooManyAttempts($fullKey, $maxAttempts)) {
            return response()->json([
                'message' => 'Too many requests. Please try again later.',
                'retry_after' => $this->limiter->availableIn($fullKey)
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $this->limiter->hit($fullKey, $decayMinutes * 60);

        $response = $next($request);

        return $response->header('X-RateLimit-Limit', $maxAttempts)
                       ->header('X-RateLimit-Remaining', $maxAttempts - $this->limiter->attempts($fullKey));
    }
}