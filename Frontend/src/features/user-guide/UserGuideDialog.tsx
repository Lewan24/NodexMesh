import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronLeft, ChevronRight, Expand, Search, ShieldCheck, X } from 'lucide-react';
import { translate } from '@/shared/i18n';
import { useBranding } from '@/features/branding/BrandingProvider';
import Modal from '@/shared/components/dialogs/Modal';
import { guideChapters, searchGuide } from './guideContent';

export default function UserGuideDialog({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const { applicationName } = useBranding();
  const chapters = guideChapters(i18n.resolvedLanguage ?? 'pl');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(chapters[0]?.id ?? 'start');
  const [zoomImage, setZoomImage] = useState(false);
  const article = useRef<HTMLElement>(null);
  const results = searchGuide(chapters, query);
  const active = results.find((chapter) => chapter.id === selectedId) ?? results[0];
  const index = active ? chapters.indexOf(active) : -1;
  const select = (id: string) => {
    setSelectedId(id);
    article.current?.scrollTo({ top: 0 });
  };
  const image = active?.image;
  const imageUrl = image ? `${import.meta.env.BASE_URL}user-guide/${image.file}` : undefined;

  return (
    <Modal centered label={translate('User guide')} onClose={onClose} readOnlyAction>
      <section className="user-guide">
        <header className="user-guide-header">
          <BookOpen size={25} aria-hidden="true" />
          <div>
            <p>{applicationName}</p>
            <h1>{translate('User guide')}</h1>
          </div>
          <button
            type="button"
            className="user-guide-icon-button"
            aria-label={translate('Close user guide')}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="user-guide-layout">
          <aside className="user-guide-sidebar">
            <label className="user-guide-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label={translate('Search the guide')}
                placeholder={translate('Search the guide…')}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  article.current?.scrollTo({ top: 0 });
                }}
              />
            </label>
            <p className="user-guide-result-count" role="status">
              {translate('{{count}} chapters', { count: results.length })}
            </p>
            <nav aria-label={translate('Guide chapters')}>
              {results.map((chapter) => (
                <button
                  type="button"
                  key={chapter.id}
                  aria-current={active?.id === chapter.id ? 'page' : undefined}
                  onClick={() => select(chapter.id)}
                >
                  <span>{String(chapters.indexOf(chapter) + 1).padStart(2, '0')}</span>
                  <span>{chapter.title}</span>
                  {chapter.admin && <ShieldCheck size={14} aria-label={translate('Administrator')} />}
                </button>
              ))}
            </nav>
          </aside>
          <article
            ref={article}
            className="user-guide-article"
            tabIndex={0}
            aria-label={active?.title ?? translate('Search results')}
          >
            {!active ? (
              <div className="user-guide-empty">
                <Search size={30} aria-hidden="true" />
                <h2>{translate('No chapters found')}</h2>
                <p>{translate('Try a tool name, such as Kanban, profile or import.')}</p>
                <button type="button" className="btn-ghost" onClick={() => setQuery('')}>
                  {translate('Clear search')}
                </button>
              </div>
            ) : (
              <>
                <p className="user-guide-eyebrow">
                  {translate('Chapter {{number}} of {{total}}', { number: index + 1, total: chapters.length })}
                  {active.admin && (
                    <span>
                      <ShieldCheck size={14} aria-hidden="true" />
                      {translate('Administrator access required')}
                    </span>
                  )}
                </p>
                <h2>{active.title}</h2>
                <p className="user-guide-summary">{active.summary}</p>
                {image && (
                  <figure>
                    <button
                      type="button"
                      className="user-guide-image"
                      aria-label={translate('Enlarge screenshot: {{caption}}', { caption: image.alt })}
                      onClick={() => setZoomImage(true)}
                    >
                      <img src={imageUrl} alt={image.alt} loading="lazy" width="1280" height="800" />
                      <span>
                        <Expand size={14} aria-hidden="true" />
                        {translate('Enlarge')}
                      </span>
                    </button>
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                )}
                {active.sections.map((section) => (
                  <section key={section.title} className="user-guide-section">
                    <h3>{section.title}</h3>
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.steps && (
                      <ol>
                        {section.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                    {section.example && (
                      <div className="user-guide-example">
                        <strong>{translate('Example')}</strong>
                        <p>{section.example}</p>
                      </div>
                    )}
                    {section.tip && (
                      <div className="user-guide-tip">
                        <strong>{translate('Good to know')}</strong>
                        <p>{section.tip}</p>
                      </div>
                    )}
                  </section>
                ))}
                <footer className="user-guide-chapter-navigation">
                  <button
                    type="button"
                    disabled={index <= 0}
                    onClick={() => {
                      setQuery('');
                      const previous = chapters[index - 1];
                      if (previous) select(previous.id);
                    }}
                  >
                    <ChevronLeft size={17} aria-hidden="true" />
                    <span>
                      {translate('Previous chapter')}
                      <strong>{chapters[index - 1]?.title}</strong>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={index >= chapters.length - 1}
                    onClick={() => {
                      setQuery('');
                      const next = chapters[index + 1];
                      if (next) select(next.id);
                    }}
                  >
                    <span>
                      {translate('Next chapter')}
                      <strong>{chapters[index + 1]?.title}</strong>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                </footer>
              </>
            )}
          </article>
        </div>
      </section>
      {zoomImage && image && (
        <Modal centered label={image.alt} onClose={() => setZoomImage(false)} readOnlyAction>
          <section className="user-guide-lightbox">
            <header>
              <h2>{image.alt}</h2>
              <button
                type="button"
                className="user-guide-icon-button"
                aria-label={translate('Close screenshot')}
                onClick={() => setZoomImage(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <img src={imageUrl} alt={image.alt} />
            <p>{image.caption}</p>
          </section>
        </Modal>
      )}
    </Modal>
  );
}
