import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Eye, 
  Share2, 
  Bookmark, 
  Heart, 
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import CommentsSection from '../components/CommentsSection';
import RelatedArticles from '../components/RelatedArticles';
import Breadcrumb from '../components/Breadcrumb';

const ArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles/${slug}`);
      const data = await response.json();
      setArticle(data.data.article);
      
      // Check if bookmarked
      const token = localStorage.getItem('token');
      if (token) {
        const bookmarkRes = await fetch(`/api/articles/${data.data.article.id}/bookmark/check`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const bookmarkData = await bookmarkRes.json();
        setIsBookmarked(bookmarkData.bookmarked);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/articles/${article.id}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        setReactions(prev => ({
          ...prev,
          [type]: (prev[type] || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleBookmark = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/articles/${article.id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article.title;
    const text = article.excerpt;

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      return;
    }

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb 
        category={article.category}
        title={article.title}
      />

      {/* Article Header */}
      <header className="mb-8">
        {article.is_breaking && (
          <div className="inline-flex items-center px-3 py-1 mb-4 bg-red-600 text-white rounded-full text-sm font-bold">
            BREAKING NEWS
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-6">
          <div className="flex items-center gap-2">
            <img
              src={article.author?.avatar || '/default-avatar.png'}
              alt={article.author?.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <span className="font-semibold dark:text-gray-300">
                {article.author?.name}
              </span>
              <div className="text-sm">
                {new Date(article.published_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.reading_time_minutes} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {article.views_count.toLocaleString()} views
            </span>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {article.featured_image && (
        <div className="mb-8 rounded-2xl overflow-hidden">
          <img
            src={article.featured_image}
            alt={article.title}
            className="w-full h-auto max-h-[500px] object-cover"
            loading="lazy"
          />
          {article.image_caption && (
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-2">
              {article.image_caption}
            </p>
          )}
        </div>
      )}

      {/* AI Summary */}
      {article.ai_summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <span className="font-semibold dark:text-white">AI Summary</span>
          </div>
          <p className="dark:text-gray-300">{article.ai_summary}</p>
        </div>
      )}

      {/* Article Content */}
      <article className="prose prose-lg dark:prose-invert max-w-none mb-12">
        <ReactMarkdown
          components={{
            img: ({ node, ...props }) => (
              <img 
                {...props} 
                className="rounded-lg shadow-lg my-6"
                loading="lazy"
              />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-bold mt-8 mb-4 dark:text-white" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="my-4 leading-relaxed dark:text-gray-300" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote 
                className="border-l-4 border-blue-500 pl-4 italic my-6 text-gray-700 dark:text-gray-300"
                {...props} 
              />
            )
          }}
        >
          {article.content}
        </ReactMarkdown>
      </article>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <a
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-full hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900"
              >
                #{tag.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Bar */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-4 mb-8">
        <div className="flex items-center justify-between">
          {/* Reactions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleReaction('like')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Heart className="w-5 h-5" />
              <span>{reactions.like || 0}</span>
            </button>
            
            <div className="flex gap-2">
              {['love', 'wow', 'sad', 'angry'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  {getEmoji(emoji)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`p-3 rounded-full ${isBookmarked ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* Share Menu */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Share2 className="w-5 h-5" />
              </button>
              
              {showShareMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 p-2 min-w-[200px]">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Facebook className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
                    >
                      <Twitter className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                    >
                      <Linkedin className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <LinkIcon className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Share this article
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <CommentsSection articleId={article.id} />

      {/* Related Articles */}
      <RelatedArticles articleId={article.id} />
    </div>
  );
};

const getEmoji = (type) => {
  const emojis = {
    like: '👍',
    love: '❤️',
    wow: '😮',
    sad: '😢',
    angry: '😠'
  };
  return emojis[type] || '👍';
};

export default ArticlePage;