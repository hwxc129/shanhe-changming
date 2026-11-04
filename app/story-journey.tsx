import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { stories } from "../data/history-stories";

export default function StoryJourney() {
  return <section className="story-journey" id="stories" aria-labelledby="stories-title">
    <header className="story-heading">
      <div>
        <span className="section-kicker">七章纪事 · 1840—1949</span>
        <h2 id="stories-title">从海疆烽火到开国大典</h2>
      </div>
      <a href="#events">浏览完整时间线 <ArrowRight size={15} aria-hidden="true" /></a>
    </header>
    <div className="story-layout">
      <nav aria-label="历史故事章节" className="story-index">
        <span><BookOpen size={15} aria-hidden="true" /> 故事目录</span>
        {stories.map(story => <a href={`#story-${story.id}`} key={story.id}>
          <span>{story.date.slice(0, 4)}</span>{story.title}
        </a>)}
      </nav>
      <ol className="story-list">
        {stories.map((story, i) => <li id={`story-${story.id}`} key={story.id}>
          <article className={story.id === "founding" ? "story-chapter story-founding" : "story-chapter"}>
            <span className="story-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="story-meta"><time dateTime={story.date}>{story.label}</time><span>{story.place}</span></div>
              <h3>{story.title}</h3>
              <p>{story.text}</p>
              <details className="story-sources">
                <summary>核对来源（{story.sources.length}）</summary>
                <ul>{story.sources.map(([institution, title, url]) => <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">{institution} · {title} <ExternalLink size={12} aria-hidden="true" /></a>
                </li>)}</ul>
              </details>
            </div>
          </article>
        </li>)}
      </ol>
    </div>
  </section>;
}
