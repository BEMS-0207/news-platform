<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Reaction;
use App\Models\Bookmark;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    // Get all articles with filters
    public function index(Request $request)
    {
        $query = Article::with(['category', 'author', 'tags'])
            ->where('status', 'published')
            ->where('published_at', '<=', now());

        // Apply filters
        if ($request->has('category')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('slug', $request->category);
            });
        }

        if ($request->has('tag')) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('slug', $request->tag);
            });
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%")
                  ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        if ($request->has('date_from')) {
            $query->whereDate('published_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('published_at', '<=', $request->date_to);
        }

        // Sort options
        $sort = $request->get('sort', 'latest');
        switch ($sort) {
            case 'popular':
                $query->orderBy('views_count', 'desc');
                break;
            case 'trending':
                // Custom algorithm for trending (views in last 24 hours)
                $query->orderBy('views_count', 'desc')
                      ->where('published_at', '>=', now()->subDay());
                break;
            default:
                $query->orderBy('published_at', 'desc');
        }

        // Pagination
        $perPage = $request->get('per_page', 12);
        $articles = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $articles,
            'message' => 'Articles retrieved successfully.'
        ]);
    }

    // Get single article
    public function show($slug)
    {
        $article = Cache::remember("article_{$slug}", 3600, function () use ($slug) {
            return Article::with(['category', 'author', 'tags', 'comments' => function ($query) {
                $query->where('status', 'approved')->with('user');
            }])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();
        });

        // Increment view count (delayed update for performance)
        Article::where('id', $article->id)->increment('views_count');

        // Track analytics
        $this->trackView($article);

        // Get related articles
        $related = $this->getRelatedArticles($article);

        return response()->json([
            'success' => true,
            'data' => [
                'article' => $article,
                'related' => $related
            ]
        ]);
    }

    // Create new article (for authors/editors)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category_id' => 'required|exists:categories,id',
            'excerpt' => 'nullable|string',
            'featured_image' => 'nullable|string',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
            'is_breaking' => 'boolean',
            'is_featured' => 'boolean',
            'is_premium' => 'boolean',
            'scheduled_for' => 'nullable|date',
            'seo_title' => 'nullable|string|max:255',
            'seo_description' => 'nullable|string',
            'seo_keywords' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        
        $article = Article::create([
            'title' => $request->title,
            'slug' => Str::slug($request->title) . '-' . Str::random(6),
            'content' => $request->content,
            'excerpt' => $request->excerpt ?? Str::limit(strip_tags($request->content), 150),
            'featured_image' => $request->featured_image,
            'category_id' => $request->category_id,
            'author_id' => $user->id,
            'status' => $user->role === 'author' ? 'pending_review' : 'draft',
            'reading_time_minutes' => $this->calculateReadingTime($request->content),
            'seo_title' => $request->seo_title,
            'seo_description' => $request->seo_description,
            'seo_keywords' => $request->seo_keywords,
            'ai_summary' => $this->generateAISummary($request->content),
            'is_breaking' => $request->is_breaking ?? false,
            'is_featured' => $request->is_featured ?? false,
            'is_premium' => $request->is_premium ?? false,
            'scheduled_for' => $request->scheduled_for
        ]);

        // Attach tags
        if ($request->has('tags')) {
            $article->tags()->attach($request->tags);
        }

        // Auto-tagging using AI
        $this->autoTagArticle($article);

        return response()->json([
            'success' => true,
            'data' => $article,
            'message' => 'Article created successfully.'
        ], 201);
    }

    // Get breaking news
    public function breakingNews()
    {
        $breaking = Cache::remember('breaking_news', 300, function () {
            return Article::with(['category', 'author'])
                ->where('is_breaking', true)
                ->where('status', 'published')
                ->where('published_at', '<=', now())
                ->orderBy('published_at', 'desc')
                ->take(5)
                ->get();
        });

        return response()->json([
            'success' => true,
            'data' => $breaking
        ]);
    }

    // Get featured articles
    public function featured()
    {
        $featured = Cache::remember('featured_articles', 600, function () {
            return Article::with(['category', 'author'])
                ->where('is_featured', true)
                ->where('status', 'published')
                ->where('published_at', '<=', now())
                ->orderBy('published_at', 'desc')
                ->take(6)
                ->get();
        });

        return response()->json([
            'success' => true,
            'data' => $featured
        ]);
    }

    // Add reaction to article
    public function addReaction(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:like,dislike,love,wow,sad,angry'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $reaction = Reaction::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'article_id' => $id
            ],
            [
                'type' => $request->type
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $reaction,
            'message' => 'Reaction added successfully.'
        ]);
    }

    // Bookmark article
    public function bookmark(Request $request, $id)
    {
        $bookmark = Bookmark::firstOrCreate([
            'user_id' => $request->user()->id,
            'article_id' => $id
        ]);

        $message = $bookmark->wasRecentlyCreated ? 'Article bookmarked.' : 'Article already bookmarked.';

        return response()->json([
            'success' => true,
            'message' => $message
        ]);
    }

    // Get popular tags
    public function popularTags()
    {
        $tags = Cache::remember('popular_tags', 3600, function () {
            return Tag::withCount('articles')
                ->orderBy('articles_count', 'desc')
                ->take(20)
                ->get();
        });

        return response()->json([
            'success' => true,
            'data' => $tags
        ]);
    }

    // Get related articles
    private function getRelatedArticles($article)
    {
        return Cache::remember("related_articles_{$article->id}", 1800, function () use ($article) {
            return Article::where('category_id', $article->category_id)
                ->where('id', '!=', $article->id)
                ->where('status', 'published')
                ->where('published_at', '<=', now())
                ->with(['category', 'author'])
                ->inRandomOrder()
                ->take(4)
                ->get();
        });
    }

    // Calculate reading time
    private function calculateReadingTime($content)
    {
        $wordCount = str_word_count(strip_tags($content));
        return ceil($wordCount / 200); // Average reading speed: 200 words per minute
    }

    // Generate AI summary (simplified - integrate with OpenAI/Google AI)
    private function generateAISummary($content)
    {
        // This is a placeholder - integrate with actual AI service
        $plainText = strip_tags($content);
        return Str::limit($plainText, 200);
    }

    // Auto-tagging using AI
    private function autoTagArticle($article)
    {
        // Placeholder for AI tagging logic
        // Integrate with NLP services like MonkeyLearn, OpenAI, etc.
    }

    // Track article view for analytics
    private function trackView($article)
    {
        // Implement analytics tracking
        // Could use queue for better performance
    }
}