<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    private $apiKey;
    private $service;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
        $this->service = config('services.ai.default', 'openai');
    }

    public function generateSummary($content)
    {
        try {
            if ($this->service === 'openai') {
                return $this->callOpenAI(
                    "Summarize this news article in 2-3 sentences:\n\n" . $content
                );
            } elseif ($this->service === 'google') {
                return $this->callGoogleAI($content);
            }
            
            return substr(strip_tags($content), 0, 200) . '...';
        } catch (\Exception $e) {
            Log::error('AI summary generation failed: ' . $e->getMessage());
            return substr(strip_tags($content), 0, 200) . '...';
        }
    }

    public function suggestTags($content)
    {
        try {
            if ($this->service === 'openai') {
                $response = $this->callOpenAI(
                    "Extract 5-7 key topics/tags from this article. Return as comma-separated values:\n\n" . $content
                );
                return array_map('trim', explode(',', $response));
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('AI tag suggestion failed: ' . $e->getMessage());
            return [];
        }
    }

    public function detectFakeNews($content, $title)
    {
        try {
            if ($this->service === 'openai') {
                $prompt = "Analyze if this news might be misleading or fake. Consider:\n";
                $prompt .= "Title: $title\n\n";
                $prompt .= "Content: $content\n\n";
                $prompt .= "Return JSON with {score: 0-1, confidence: 0-1, flags: [], suggestion: string}";
                
                $response = $this->callOpenAI($prompt, true);
                return json_decode($response, true);
            }
            
            return [
                'score' => 0.1,
                'confidence' => 0.5,
                'flags' => [],
                'suggestion' => 'Analysis not available'
            ];
        } catch (\Exception $e) {
            Log::error('Fake news detection failed: ' . $e->getMessage());
            return null;
        }
    }

    public function generateRelatedArticles($article, $count = 5)
    {
        try {
            $prompt = "Based on this article about {$article->category->name}, ";
            $prompt .= "suggest {$count} related topics or angles for follow-up articles:\n\n";
            $prompt .= "Title: {$article->title}\n";
            $prompt .= "Content: " . substr(strip_tags($article->content), 0, 1000) . "\n\n";
            $prompt .= "Return as a numbered list of article ideas.";
            
            return $this->callOpenAI($prompt);
        } catch (\Exception $e) {
            Log::error('Related articles generation failed: ' . $e->getMessage());
            return [];
        }
    }

    private function callOpenAI($prompt, $json = false)
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'max_tokens' => $json ? 500 : 150,
            'temperature' => 0.7,
            'response_format' => $json ? ['type' => 'json_object'] : null
        ]);

        if ($response->successful()) {
            return $response->json()['choices'][0]['message']['content'];
        }

        throw new \Exception('OpenAI API request failed');
    }

    private function callGoogleAI($content)
    {
        // Implement Google AI (Gemini) integration
        return substr(strip_tags($content), 0, 200) . '...';
    }
}