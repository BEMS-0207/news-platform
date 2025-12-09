<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Analytics;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $period = $request->get('period', 'today'); // today, week, month, year

        $dateFilter = $this->getDateFilter($period);

        // Total views
        $totalViews = Analytics::whereBetween('created_at', $dateFilter)->count();

        // Unique visitors
        $uniqueVisitors = Analytics::whereBetween('created_at', $dateFilter)
            ->distinct('session_id')
            ->count('session_id');

        // Top articles
        $topArticles = Article::with(['category', 'author'])
            ->whereBetween('created_at', $dateFilter)
            ->orderBy('views_count', 'desc')
            ->take(10)
            ->get(['id', 'title', 'views_count', 'category_id', 'author_id']);

        // Views by category
        $viewsByCategory = DB::table('analytics')
            ->join('articles', 'analytics.article_id', '=', 'articles.id')
            ->join('categories', 'articles.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('COUNT(*) as views'))
            ->whereBetween('analytics.created_at', $dateFilter)
            ->groupBy('categories.id', 'categories.name')
            ->orderBy('views', 'desc')
            ->get();

        // Traffic sources
        $trafficSources = Analytics::whereBetween('created_at', $dateFilter)
            ->select(
                DB::raw('CASE 
                    WHEN referrer LIKE "%google%" THEN "Google"
                    WHEN referrer LIKE "%facebook%" THEN "Facebook"
                    WHEN referrer LIKE "%twitter%" THEN "Twitter"
                    WHEN referrer = "" OR referrer IS NULL THEN "Direct"
                    ELSE "Other Referrals"
                END as source'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('source')
            ->get();

        // Hourly/daily trends
        $trendData = Analytics::whereBetween('created_at', $dateFilter)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('HOUR(created_at) as hour'),
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('date', 'hour')
            ->orderBy('date')
            ->orderBy('hour')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_views' => $totalViews,
                'unique_visitors' => $uniqueVisitors,
                'top_articles' => $topArticles,
                'views_by_category' => $viewsByCategory,
                'traffic_sources' => $trafficSources,
                'trend_data' => $trendData,
                'period' => $period
            ]
        ]);
    }

    public function articleAnalytics($articleId)
    {
        $article = Article::with(['category', 'author'])->findOrFail($articleId);

        $stats = [
            'total_views' => $article->views_count,
            'views_today' => Analytics::where('article_id', $articleId)
                ->whereDate('created_at', today())
                ->count(),
            'views_this_week' => Analytics::where('article_id', $articleId)
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'avg_time_spent' => Analytics::where('article_id', $articleId)
                ->where('time_spent_seconds', '>', 0)
                ->avg('time_spent_seconds'),
            'geo_distribution' => Analytics::where('article_id', $articleId)
                ->select('country', DB::raw('COUNT(*) as count'))
                ->whereNotNull('country')
                ->groupBy('country')
                ->orderBy('count', 'desc')
                ->take(10)
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'article' => $article,
                'analytics' => $stats
            ]
        ]);
    }

    private function getDateFilter($period)
    {
        switch ($period) {
            case 'today':
                return [today(), now()->endOfDay()];
            case 'week':
                return [now()->startOfWeek(), now()->endOfWeek()];
            case 'month':
                return [now()->startOfMonth(), now()->endOfMonth()];
            case 'year':
                return [now()->startOfYear(), now()->endOfYear()];
            default:
                return [now()->subDays(7), now()];
        }
    }
}