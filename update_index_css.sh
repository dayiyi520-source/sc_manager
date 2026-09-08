cat << 'INNER_EOF' > src/index.css
@import "tailwindcss";

@layer base {
  :root {
    --bg-page: #0C0F13;
    --bg-nav: #0B111A;
    --bg-surface: #121923;
    --bg-surface-soft: #151A22;
    --bg-surface-hover: #18212C;
    --bg-card: #0D1620;
    
    --border-default: #2C3440;
    --border-strong: #3A4655;
    
    --text-primary: #F8FAFC;
    --text-muted: #A5ADBA;
    --text-subtle: #7C8796;
    
    --brand-primary: #2F66F6;
    --brand-primary-hover: #3B73FF;
    --brand-active-text: #6EA0FF;
    
    --color-success: #22C55E;
    --color-warning: #FACC15;
    --color-danger: #F26D5B;
  }
  
  body {
    background-color: var(--bg-page);
    color: var(--text-primary);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow-x: hidden;
  }

  h1, h2, h3, .font-display {
    letter-spacing: -0.015em;
  }

  .font-mono-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  /* Table styling */
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }

  th {
    color: var(--text-muted);
    font-weight: 500;
  }
}

/* Custom Sleek Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg-page);
}
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 9999px;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* BeyondOrbit Component Theme */
.dark-panel {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-default);
}
.dark-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}
.dark-card-hover {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dark-card-hover:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.gold-badge {
  background-color: #172743;
  color: #6EA0FF;
  border: 1px solid #3F7BFF;
}
.gold-gradient-bg {
  background: #2F66F6;
}
.gold-gradient-text {
  color: #2F66F6;
}
INNER_EOF
