import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommandPalette.css';

interface CommandItem {
    id: string;
    label: string;
    action: () => void;
    icon?: string;
    shortcut?: string;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const commands: CommandItem[] = [
        { id: 'nexus', label: 'Open NEXUS Studio', icon: '○', action: () => navigate('/nexus') },
        { id: 'creative', label: 'Open Creative Studio', icon: '◈', action: () => navigate('/creative') },
        { id: 'scout', label: 'Open SCOUT Browser', icon: '◉', action: () => navigate('/scout') },
        { id: 'flows', label: 'Open Flow Explorer', icon: '⬡', action: () => navigate('/flows') },
        { id: 'agents', label: 'Agent Catalog', icon: '⬢', action: () => navigate('/agents') },
        { id: 'dispatch', label: 'Dispatch Board', icon: '⊕', action: () => navigate('/') },
        { id: 'health', label: 'Health & Metrics', icon: '🔬', action: () => navigate('/health') },
        { id: 'constitution', label: 'Constitution', icon: '⚖', action: () => navigate('/constitution') },
    ];

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(o => !o);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        }
        if (e.key === 'Enter' && filtered[selectedIndex]) {
            e.preventDefault();
            filtered[selectedIndex].action();
            setOpen(false);
        }
    };

    if (!open) return null;

    return (
        <div className="cmdk-backdrop" onClick={() => setOpen(false)}>
            <div className="cmdk-dialog" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    className="cmdk-input"
                    placeholder="Type a command or search... (ESC to close)"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                />
                <div className="cmdk-list">
                    {filtered.length === 0 ? (
                        <div className="cmdk-empty">No results found.</div>
                    ) : (
                        filtered.map((cmd, i) => (
                            <div
                                key={cmd.id}
                                className={`cmdk-item ${i === selectedIndex ? 'selected' : ''}`}
                                onMouseEnter={() => setSelectedIndex(i)}
                                onClick={() => {
                                    cmd.action();
                                    setOpen(false);
                                }}
                            >
                                {cmd.icon && <span className="cmdk-icon">{cmd.icon}</span>}
                                {cmd.label}
                                {cmd.shortcut && <span className="cmdk-shortcut">{cmd.shortcut}</span>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
