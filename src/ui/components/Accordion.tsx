import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  description,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="accordion">
      <button
        className="accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="accordion-header-content">
          <h2 className="accordion-title">{title}</h2>
          {description && (
            <p className="accordion-description">{description}</p>
          )}
        </div>
        <span className="accordion-icon">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};
