# Native splash and HTML splash timing

The native launch splash assets remain solid black so the standalone wordmark does not flash before the WebView is ready. The existing HTML Crizon animated splash design and animation are unchanged. The native splash is now hidden shortly after the HTML splash is rendered, and the Capacitor launch duration cap is reduced to 500 ms. A very brief black native frame can still occur while Android starts the WebView; HTML/CSS cannot render before the WebView is ready.
