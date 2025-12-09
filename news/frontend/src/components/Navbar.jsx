import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Moon, Sun, Bell, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ breakingNews }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.data));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const BreakingNewsTicker = () => (
    <div className="bg-red-600 text-white py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        {breakingNews.map((news, index) => (
          <React.Fragment key={news.id}>
            <Link to={`/article/${news.slug}`} className="mx-4 hover:underline">
              <span className="font-bold">BREAKING:</span> {news.title}
            </Link>
            {index < breakingNews.length - 1 && ' • '}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <BreakingNewsTicker />
      
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">
                NewsHub
              </span>
            </Link>

            {/* Desktop Categories */}
            <div className="hidden md:flex items-center space-x-6">
              {categories.slice(0, 6).map(category => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                  style={{ color: category.color }}
                >
                  {category.name}
                </Link>
              ))}
              <Link
                to="/categories"
                className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                More...
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Notifications */}
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              {user ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Profile
                    </Link>
                    <Link to="/bookmarks" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      Bookmarks
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Dashboard
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Login
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {isSearchOpen && (
            <div className="py-4 border-t dark:border-gray-700">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news, topics, authors..."
                  className="w-full p-3 pl-12 rounded-lg bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-3 top-2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Search
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t dark:border-gray-700">
            <div className="px-4 py-3 space-y-2">
              {categories.map(category => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="block py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;