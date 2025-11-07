import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'search' | 'tags';
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage }) => {
  const navigate = useNavigate();

  const handleNavigation = (page: string) => {
    void navigate(`/${page}`);
  };

  return (
    <>
      <div className="page-container">
        <div className="page-content">{children}</div>
      </div>
      <div className="footer">
        <div
          className={`footer-nav-item ${currentPage === 'search' ? 'active' : ''}`}
          onClick={() => handleNavigation('search')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNavigation('search');
            }
          }}
        >
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Search</span>
        </div>
        <div
          className={`footer-nav-item ${currentPage === 'tags' ? 'active' : ''}`}
          onClick={() => handleNavigation('tags')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNavigation('tags');
            }
          }}
        >
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
          <span>Tags</span>
        </div>
      </div>
    </>
  );
};
