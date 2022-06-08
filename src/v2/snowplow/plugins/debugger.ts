

const debuggerPlugin = () => {
    window.tracker('addPlugin',
        "https://cdn.jsdelivr.net/npm/@snowplow/browser-plugin-debugger@latest/dist/index.umd.min.js",
        ["snowplowDebugger", "DebuggerPlugin"],
    );
}

export default debuggerPlugin;