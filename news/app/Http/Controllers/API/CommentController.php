<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    public function index($articleId)
    {
        $comments = Comment::with(['user', 'replies' => function ($query) {
            $query->where('status', 'approved')->with('user');
        }])
        ->where('article_id', $articleId)
        ->where('parent_id', null)
        ->where('status', 'approved')
        ->orderBy('created_at', 'desc')
        ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $comments
        ]);
    }

    public function store(Request $request, $articleId)
    {
        $validator = Validator::make($request->all(), [
            'content' => 'required|string|min:3|max:1000',
            'parent_id' => 'nullable|exists:comments,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $article = Article::findOrFail($articleId);

        // Check if comments are open
        if (!$article->allow_comments) {
            return response()->json([
                'success' => false,
                'message' => 'Comments are closed for this article.'
            ], 403);
        }

        // CAPTCHA validation (if not logged in)
        if (!$request->user() && !$this->validateCaptcha($request->captcha_token)) {
            return response()->json([
                'success' => false,
                'message' => 'CAPTCHA verification failed.'
            ], 422);
        }

        $comment = Comment::create([
            'article_id' => $articleId,
            'user_id' => $request->user() ? $request->user()->id : null,
            'parent_id' => $request->parent_id,
            'content' => $request->content,
            'status' => $request->user() ? 'approved' : 'pending', // Guest comments need moderation
            'user_ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        // Send notification to admin for moderation if guest comment

        return response()->json([
            'success' => true,
            'data' => $comment,
            'message' => 'Comment submitted successfully. ' . 
                ($request->user() ? '' : 'It will appear after moderation.')
        ]);
    }

    public function like(Request $request, $id)
    {
        $comment = Comment::findOrFail($id);
        $comment->increment('likes_count');

        return response()->json([
            'success' => true,
            'message' => 'Comment liked.'
        ]);
    }

    private function validateCaptcha($token)
    {
        // Integrate with Google reCAPTCHA or hCaptcha
        // This is a placeholder
        return true; // In production, validate with CAPTCHA service
    }
}