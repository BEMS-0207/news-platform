<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Sitemap\Sitemap;
use Spatie\Sitemap\Tags\Url;
use App\Models\Article;
use App\Models\Category;

class GenerateSitemap extends Command
{
    protected $signature = 'sitemap:generate';
    protected $description = 'Generate XML sitemap for SEO';

    public function handle()
    {
        $sitemap = Sitemap::create();

        // Homepage
        $sitemap->add(Url::create('/')
            ->setPriority(1.0)
            ->setChangeFrequency(Url::CHANGE_FREQUENCY_DAILY));

        // Categories
        Category::chunk(100, function ($categories) use ($sitemap) {
            foreach ($categories as $category) {
                $sitemap->add(Url::create("/category/{$category->slug}")
                    ->setPriority(0.8)
                    ->setChangeFrequency(Url::CHANGE_FREQUENCY_WEEKLY));
            }
        });

        // Articles
        Article::where('status', 'published')
            ->chunk(100, function ($articles) use ($sitemap) {
                foreach ($articles as $article) {
                    $sitemap->add(Url::create("/article/{$article->slug}")
                        ->setLastModificationDate($article->updated_at)
                        ->setPriority(0.9)
                        ->setChangeFrequency(Url::CHANGE_FREQUENCY_MONTHLY));
                }
            });

        $sitemap->writeToFile(public_path('sitemap.xml'));
        
        $this->info('Sitemap generated successfully!');
    }
}