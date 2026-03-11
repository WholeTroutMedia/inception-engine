

export default function TokenPlayground() {
    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Token Playground</h1>
                    <p className="page-subtitle">Open Props / KickstartDS Foundation Sandbox</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Typographic Scale (Open Props)</h2>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--size-3)' }}>
                    <div style={{ fontSize: 'var(--font-size-8)', fontWeight: 'var(--font-weight-9)' }}>Hero Heading</div>
                    <div style={{ fontSize: 'var(--font-size-6)', fontWeight: 'var(--font-weight-7)' }}>Section Header</div>
                    <div style={{ fontSize: 'var(--font-size-4)', fontWeight: 'var(--font-weight-5)' }}>Article Title</div>
                    <div style={{ fontSize: 'var(--font-size-2)', color: 'var(--text-secondary)' }}>Standard Body Text</div>
                    <div style={{ fontSize: 'var(--font-size-0)', color: 'var(--text-tertiary)' }}>Metadata / Captions</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Surface Colors</h2>
                </div>
                <div style={{ padding: '20px', display: 'flex', gap: 'var(--size-4)', flexWrap: 'wrap' }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{
                            width: 'var(--size-10)',
                            height: 'var(--size-10)',
                            backgroundColor: `var(--surface-${i + 1})`,
                            borderRadius: 'var(--radius-3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: i < 5 ? 'var(--gray-9)' : 'var(--gray-1)',
                            fontWeight: 'bold',
                            boxShadow: 'var(--shadow-3)'
                        }}>
                            {i + 1}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Animations & Easing</h2>
                </div>
                <div style={{ padding: '20px', display: 'flex', gap: 'var(--size-6)' }}>
                    <div className="hover-target" style={{
                        padding: 'var(--size-4) var(--size-6)',
                        backgroundColor: 'var(--accent-1)',
                        color: 'black',
                        borderRadius: 'var(--radius-round)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'transform 0.2s var(--ease-spring-3)',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Hover (Spring 3)
                    </div>

                    <div className="hover-target" style={{
                        padding: 'var(--size-4) var(--size-6)',
                        backgroundColor: 'var(--accent-2)',
                        color: 'white',
                        borderRadius: 'var(--radius-round)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'transform 0.4s var(--ease-elastic-3)',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                    >
                        Hover (Elastic 3)
                    </div>
                </div>
            </div>
        </div>
    );
}
