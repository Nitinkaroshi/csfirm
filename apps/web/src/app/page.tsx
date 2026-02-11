export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>CSFIRM Platform</h1>
      <p>Multi-tenant SaaS platform for Company Secretary firms.</p>
      <p style={{ color: '#666' }}>Frontend coming in Phase 2. API running at <code>localhost:3000</code></p>
      <ul>
        <li><a href="http://localhost:3000/api/docs">API Documentation (Swagger)</a></li>
        <li><a href="http://localhost:3000/api/health">Health Check</a></li>
      </ul>
    </main>
  );
}
