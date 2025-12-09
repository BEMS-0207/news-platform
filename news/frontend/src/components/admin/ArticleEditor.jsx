import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Eye, Send, Calendar, Tag, Upload } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ArticleEditor = ({ articleId }) => {
  const navigate = useNavigate();
  const [article, setArticle] = useState({
    title: '',
    content: '',
    excerpt: '',
    category_id: '',
    tags: [],
    featured_image: '',
    is_breaking: false,
    is_featured: false,
    is_premium: false,
    scheduled_for: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: ''
  });
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    
    if (articleId) {
      fetchArticle();
    }

    // Auto-save interval
    const interval = setInterval(() => {
      if (article.title || article.content) {
        autoSave();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [articleId]);

  const fetchArticle = async () => {
    const response = await fetch(`/api/admin/articles/${articleId}`);
    const data = await response.json();
    setArticle(data.data);
  };

  const fetchCategories = async () => {
    const response = await fetch('/api/categories');
    const data = await response.json();
    setCategories(data.data);
  };

  const fetchTags = async () => {
    const response = await fetch('/api/tags');
    const data = await response.json();
    setAllTags(data.data);
  };

  const handleChange = (field, value) => {
    setArticle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagSelect = (tagId) => {
    if (article.tags.includes(tagId)) {
      setArticle(prev => ({
        ...prev,
        tags: prev.tags.filter(id => id !== tagId)
      }));
    } else {
      setArticle(prev => ({
        ...prev,
        tags: [...prev.tags, tagId]
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      handleChange('featured_image', data.url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const autoSave = async () => {
    if (!article.title && !article.content) return;

    setAutoSaving(true);
    try {
      const response = await fetch('/api/admin/articles/auto-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(article)
      });
      
      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async (status = 'draft') => {
    setLoading(true);
    try {
      const url = articleId 
        ? `/api/admin/articles/${articleId}`
        : '/api/admin/articles';
      
      const method = articleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...article,
          status
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (!articleId) {
          navigate(`/admin/articles/edit/${data.data.id}`);
        }
        alert(`Article ${status === 'draft' ? 'saved' : 'submitted'} successfully!`);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Error saving article');
    } finally {
      setLoading(false);
    }
  };

  const generateSEO = () => {
    if (!article.title) return;

    handleChange('seo_title', article.title);
    handleChange('seo_description', 
      article.excerpt || 
      article.content.substring(0, 160).replace(/<[^>]*>/g, '')
    );
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">
            {articleId ? 'Edit Article' : 'Create New Article'}
          </h1>
          {lastSaved && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Auto-saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {autoSaving && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave('pending_review')}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 inline mr-2" />
            Submit for Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={article.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Article Title"
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none dark:text-white placeholder-gray-400"
            />
            <div className="text-sm text-gray-500 mt-1">
              Slug: {article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Featured Image
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              {article.featured_image ? (
                <div className="relative">
                  <img
                    src={article.featured_image}
                    alt="Featured"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() => handleChange('featured_image', '')}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-2">
                    Drag & drop or click to upload
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Upload Image
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Content
            </label>
            <ReactQuill
              value={article.content}
              onChange={(value) => handleChange('content', value)}
              modules={modules}
              className="h-96 mb-12 dark:text-white"
              theme="snow"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Excerpt
            </label>
            <textarea
              value={article.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Brief summary of the article (appears in listings)"
              className="w-full h-32 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-bold mb-4 dark:text-white">Publish Settings</h3>
            
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Category
                </label>
                <select
                  value={article.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {article.tags.map(tagId => {
                    const tag = allTags.find(t => t.id === tagId);
                    return tag ? (
                      <span
                        key={tagId}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-1"
                      >
                        {tag.name}
                        <button
                          onClick={() => handleTagSelect(tagId)}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {allTags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <span className="dark:text-gray-300">#{tag.name}</span>
                      <button
                        onClick={() => handleTagSelect(tag.id)}
                        className={`p-1 rounded ${article.tags.includes(tag.id) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
                      >
                        {article.tags.includes(tag.id) ? '✓' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={article.is_breaking}
                    onChange={(e) => handleChange('is_breaking', e.target.checked)}
                    className="rounded"
                  />
                  <span className="dark:text-gray-300">Breaking News</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={article.is_featured}
                    onChange={(e) => handleChange('is_featured', e.target.checked)}
                    className="rounded"
                  />
                  <span className="dark:text-gray-300">Featured Article</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={article.is_premium}
                    onChange={(e) => handleChange('is_premium', e.target.checked)}
                    className="rounded"
                  />
                  <span className="dark:text-gray-300">Premium Content</span>
                </label>
              </div>

              {/* Schedule */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  Schedule Publication
                </label>
                <input
                  type="datetime-local"
                  value={article.scheduled_for}
                  onChange={(e) => handleChange('scheduled_for', e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold dark:text-white">SEO Settings</h3>
              <button
                onClick={generateSEO}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm"
              >
                Auto-generate
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={article.seo_title}
                  onChange={(e) => handleChange('seo_title', e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {article.seo_title?.length || 0}/60 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Meta Description
                </label>
                <textarea
                  value={article.seo_description}
                  onChange={(e) => handleChange('seo_description', e.target.value)}
                  className="w-full h-24 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {article.seo_description?.length || 0}/160 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Keywords
                </label>
                <input
                  type="text"
                  value={article.seo_keywords}
                  onChange={(e) => handleChange('seo_keywords', e.target.value)}
                  placeholder="comma, separated, keywords"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* AI Features */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <h3 className="font-bold mb-3">AI Assistant</h3>
            <div className="space-y-3">
              <button
                onClick={() => {/* Generate summary */}}
                className="w-full bg-white/20 hover:bg-white/30 p-2 rounded text-sm"
              >
                Generate AI Summary
              </button>
              <button
                onClick={() => {/* Auto-tag */}}
                className="w-full bg-white/20 hover:bg-white/30 p-2 rounded text-sm"
              >
                Auto-tag Article
              </button>
              <button
                onClick={() => {/* Fact check */}}
                className="w-full bg-white/20 hover:bg-white/30 p-2 rounded text-sm"
              >
                Fact Check Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;