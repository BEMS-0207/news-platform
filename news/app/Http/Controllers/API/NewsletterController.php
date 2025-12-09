<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use App\Mail\NewsletterConfirmation;
use Illuminate\Support\Str;

class NewsletterController extends Controller
{
    public function subscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'categories' => 'nullable|array',
            'frequency' => 'nullable|in:daily,weekly,monthly'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $existing = Subscription::where('email', $request->email)->first();

        if ($existing) {
            if ($existing->is_verified && $existing->unsubscribed_at === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already subscribed.'
                ], 409);
            } elseif ($existing->is_verified && $existing->unsubscribed_at) {
                // Resubscribe
                $existing->update([
                    'unsubscribed_at' => null,
                    'preferences' => json_encode([
                        'categories' => $request->categories ?? [],
                        'frequency' => $request->frequency ?? 'daily'
                    ])
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Successfully resubscribed!'
                ]);
            }
        }

        $token = Str::random(32);
        
        $subscription = Subscription::create([
            'email' => $request->email,
            'token' => $token,
            'preferences' => json_encode([
                'categories' => $request->categories ?? [],
                'frequency' => $request->frequency ?? 'daily'
            ])
        ]);

        // Send confirmation email
        Mail::to($request->email)->send(new NewsletterConfirmation($token));

        return response()->json([
            'success' => true,
            'message' => 'Please check your email to confirm your subscription.'
        ]);
    }

    public function confirm($token)
    {
        $subscription = Subscription::where('token', $token)->firstOrFail();

        if ($subscription->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription already confirmed.'
            ], 400);
        }

        $subscription->update([
            'is_verified' => true,
            'subscribed_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription confirmed successfully!'
        ]);
    }

    public function unsubscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:subscriptions,email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $subscription = Subscription::where('email', $request->email)->first();
        $subscription->update(['unsubscribed_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Successfully unsubscribed.'
        ]);
    }
}