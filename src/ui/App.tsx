import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { BookmarksPage } from './pages/BookmarksPage';
import { SearchPage } from './pages/SearchPage';
import { TagsPage } from './pages/TagsPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
      </Routes>
    </HashRouter>
  );
};
