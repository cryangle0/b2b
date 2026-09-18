const { useStore, useHash, Toasts } = window;
const MallApp = window.MallApp;
const OpsApp = window.OpsApp;

function App() {
  const s = useStore();
  const { path, parts, query } = useHash();
  if (path.startsWith("/ops")) return <OpsApp s={s} path={path} />;
  return <MallApp s={s} path={path} parts={parts} query={query} />;
}

function Root() {
  const s = useStore();
  return (
    <div>
      <App />
      <Toasts list={s.toasts} />
    </div>
  );
}

function boot() {
  if (!window.MallApp || !window.OpsApp || !window.useStore) {
    return setTimeout(boot, 30);
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
}
boot();
