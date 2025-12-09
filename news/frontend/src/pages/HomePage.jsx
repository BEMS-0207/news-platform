import React, { useState, useEffect } from 'react';
import FeaturedSlider from '../components/FeaturedSlider';
import ArticleGrid from '../components/ArticleGrid';
import CategoryFilter from '../components/CategoryFilter';
import TrendingSidebar from '../components/TrendingSidebar';
import NewsletterPopup from '../components/NewsletterPopup';

const HomePage = () => {
  const [articles, setArticles] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showNewsletter, setShowNewsletter] = useState(false);

  useEffect(() => {
    // Check if newsletter popup should be shown
    const hasSeenPopup = localStorage.getItem('newsletter_popup_seen');
    if (!hasSeenPopup) {
      setTimeout(() => {
        setShowNewsletter(true);
      }, 5000);
    }

    fetchData();
  }, [category]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [articlesRes, featuredRes, trendingRes] = await Promise.all([
        fetch(`/api/articles?category=${category}&per_page=12`),
        fetch('/api/articles/featured'),
        fetch('/api/articles?sort=trending&per_page=5')
      ]);

      const articlesData = await articlesRes.json();
      const featuredData = await featuredRes.json();
      const trendingData = await trendingRes.json();

      setArticles(articlesData.data);
      setFeatured(featuredData.data);
      setTrending(trendingData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
  };

  const handleNewsletterClose = () => {
    setShowNewsletter(false);
    localStorage.setItem('newsletter_popup_seen', 'true');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Featured Articles Slider */}
      <FeaturedSlider articles={featured} />

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8 mt-8">
        {/* Articles Grid */}
        <div className="lg:w-3/4">
          <CategoryFilter
            selectedCategory={category}
            onCategoryChange={handleCategoryChange}
          />
          
          <ArticleGrid articles={articles} />

          {/* Load More Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => {/* Implement pagination */}}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load More Articles
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/4">
          <TrendingSidebar articles={trending} />
          
          {/* Newsletter Signup (Sidebar) */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-6">
            <h3 className="text-xl font-bold mb-3">Stay Updated</h3>
            <p className="mb-4">Get the latest news delivered to your inbox.</p>
            <button
              onClick={() => setShowNewsletter(true)}
              className="w-full bg-white text-blue-600 py-2 rounded-lg font-semibold hover:bg-gray-100"
            >
              Subscribe Now
            </button>
          </div>

          {/* Popular Tags */}
          <PopularTags />
        </div>
      </div>

      {/* Newsletter Popup */}
      {showNewsletter && (
        <NewsletterPopup onClose={handleNewsletterClose} />
      )}
    </div>
  );
};

const PopularTags = () => {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetch('/api/tags/popular')
      .then(res => res.json())
      .then(data => setTags(data.data));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="text-xl font-bold mb-4 dark:text-white">Popular Topics</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <a
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm hover:bg-blue-100 hover:text-blue-600"
          >
            #{tag.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default HomePage;