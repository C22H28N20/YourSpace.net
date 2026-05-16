export default function Loading() {
  return (
    <section className="content-grid">
      <article className="main-panel card-enter">
        <div className="panel-head">
          <h2>Loading...</h2>
          <p>Preparing the next tab.</p>
        </div>

        <div className="panel-body">
          <div className="loading-skeleton loading-skeleton-title" />
          <div className="loading-skeleton loading-skeleton-line" />
          <div className="loading-skeleton loading-skeleton-line" />
          <div className="loading-skeleton loading-skeleton-block" />
        </div>
      </article>
    </section>
  );
}