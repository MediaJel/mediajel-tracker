export const tapadCookieSyncPixel = () => {
    setTimeout(
        function (e, o, n, t, a, c, i) {
            if (!e[a]) {
                e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
                e.GlobalSnowplowNamespace.push(a);
                e[a] = function () {
                    (e[a].q = e[a].q || []).push(arguments);
                };
                e[a].q = e[a].q || [];
                c = o.createElement(n);
                i = o.getElementsByTagName(n)[0];
                c.decoding = "async";
                c.src = t;
                c.height = 0;
                c.width = 0;
                c.border = 0;
            }
        },
        1e3,
        window,
        document,
        "img",
        "https://sync.dmp.cnna.io/cs",
        "Sync"
    );
}