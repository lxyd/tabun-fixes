define(function() {

    // configuration values before, after, orig, proxies look like:
    // [{
    //     "key": obj,
    //     "vals": {
    //         "someFieldName": fieldValueOrArrayOfValues,
    //         ...
    //     },
    // }]
    var cfg = {
            before: []
          , after: []
          , orig: []
          , proxies: []
        }

    var global = this

    /**
     *  Add a function to be run before (after) execution some other
     *  function available at root.path
     *
     *  @param root   - optional, global object if ommited
     *  @param path   - path to root's field (currently only simple field name is supported)
     *  @param fn     - function to execute before (after) root.path
     *                  if fn returns false, execution is terminated
     *  @param options {
     *      after : boolean - execute fn after function (default false)
     *      force : boolean - force re-writing a proxy even if already written
     *                        (for the case it has been removed somewhere else)
     *  }
     */
    function addHook(root, path, fn, options) {
        var args = parseArgs.apply(this, arguments)
        root = args.root
        path = args.path
        fn = args.fn
        options = args.options

        var cur = getPath(root, path)

        if (typeof cur != 'function') {
            throw new Error("Only functions might be hooked")
        }

        addCfgElement(options.after ? cfg.after : cfg.before, root, path, fn)

        var proxy = getCfg(cfg.proxies, root, path)
          , orig = getCfg(cfg.orig, root, path)
        var write = false
        if (!proxy) {
            // proxy was not written yet
            orig = cur
            proxy = createProxy(root, path, cur)
            write = true
        } else if (cur !== proxy && options.force) {
            // proxy was written, but currently there is another function at root[path]
            // according to the force option, consider proxy to be thrown away
            orig = cur
            proxy = createProxy(root, path, cur)
            write = true
        }
        // otherwise consider proxy written and functional (but possibly hidden behind another proxy)

        if (write) {
            setCfg(cfg.orig, root, path, orig)
            setCfg(cfg.proxies, root, path, proxy)
            setPath(root, path, proxy)
        }
    }

    /**
     *  Remove previously added hook
     *
     *  @param root   - optional, global object if ommited
     *  @param path   - path to root's field (currently only simple field name is supported)
     *  @param fn     - function to execute before (after) root.path
     *                  if fn returns false, execution is terminated
     *  @param options {
     *      after : boolean - execute fn after function (default false)
     *  }
     */
    function removeHook(root, path, fn, options) {
        var args = parseArgs.apply(this, arguments)
        root = args.root
        path = args.path
        fn = args.fn
        options = args.options

        removeCfgElement(options.after ? cfg.after : cfg.before, root, path, fn)

        if (getCfg(cfg.after, root, path).length + getCfg(cfg.before, root, path).length == 0) {
            removeAllHooks(root, path)
        }
    }

    function removeAllHooks(root, path) {
        if (typeof root == 'string') {
            path = root
            root = global
        }
        if (!root) {
            root = global
        }
        if (!path) {
            throw new Error("Path must not be empty")
        }

        removeCfg(cfg.before, root, path)
        removeCfg(cfg.after, root, path)

        var orig = getCfg(cfg.orig, root, path)
          , proxy = getCfg(cfg.proxies, root, path)
          , cur = getPath(root, path)

        // replace function with orig if we are currently on top of proxy chain
        if (cur === proxy) {
            setPath(root, path, orig)
        }
        // if cur !== proxy, leak a bit of memory by leaving and forgetting
        // our proxy in root.path proxy chain
        removeCfg(cfg.proxies, root, path)
        removeCfg(cfg.orig, root, path)
    }

    function parseArgs(root, path, fn, options) {
        if (typeof root == 'string') {
            options = fn
            fn = path
            path = root
            root = global
        }
        if (!root) {
            root = global
        }
        if (!path) {
            throw new Error("Path must not be empty")
        }
        if (typeof options == 'boolean') {
            options = { after: options }
        } else {
            options = options || {}
        }

        return {
            root:    root,
            path:    path,
            fn:      fn,
            options: options,
        }
    }

    function createProxy(root, path, orig) {
        return function() {
            return doProxy(root, path, orig, arguments)
        }
    }

    function doProxy(root, path, orig, args) {
        var hooks
          , res
          , origRes

        hooks = getCfg(cfg.before, root, path) || []

        // if any before-hook returns a value, stop
        // execution and return that value
        for (var i = 0; i < hooks.length; i++) {
            try {
                res = hooks[i].call(root, args)
            } catch (err) {
                return
            }
            if (typeof res != 'undefined') {
                return res
            }
        }

        origRes = orig.apply(root, args)

        hooks = getCfg(cfg.after, root, path) || []

        for (var i = 0; i < hooks.length; i++) {
            try {
                res = hooks[i].call(root, origRes, args)
            } catch (err) {
                return
            }
            if (typeof res != 'undefined') {
                return res
            }
        }

        return origRes
    }

    function getPath(root, path) {
        return root[path]
    }

    function setPath(root, path, val) {
        root[path] = val
    }

    function getCfg(cfg, key, path) {
        return (findCfgForKey(cfg, key)||{})[path]
    }

    function setCfg(cfg, key, path, val) {
        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            vals = {}
            cfg.push({
                key:  key,
                vals: vals,
            })
        }
        vals[path] = val
    }

    function removeCfg(cfg, key, path) {
        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            return
        }
        delete vals[path]
        if (Object.keys(vals).length == 0) {
            removeCfgForKey(cfg, key)
        }
    }

    function addCfgElement(cfg, key, path, val) {
        removeCfgElement(cfg, key, path, val)

        var vals = findCfgForKey(cfg, key)
        if (!vals) {
            vals = {}
            cfg.push({
                key:  key,
                vals: vals,
            })
        }
        vals[path] = vals[path] || []
        if (!Array.isArray(vals[path])) {
            throw new Error("Cannot add to non-array element")
        }
        vals[path].push(val)
    }

    function removeCfgElement(cfg, key, path, val) {
        var vals = findCfgForKey(cfg, key)
        if (!vals || !(path in vals)) {
            return
        }

        var idx = -1
        for (var i = 0; i < vals[path].length; i++) {
            if (vals[path][i] === val) {
                idx = i
                break
            }
        }

        if (idx >= 0) {
            vals[path].splice(idx, 1)
        }

        if (vals[path].length == 0) {
            delete vals[path]
        }

        if (Object.keys(vals).length == 0) {
            removeCfgForKey(cfg, key)
        }
    }

    function findCfgForKey(cfg, key) {
        for (var i = 0; i < cfg.length; i++) {
            var o = cfg[i]
            if (key == o.key) {
                return o.vals
            }
        }
    }

    function removeCfgForKey(cfg, key) {
        var idx = -1
        for (var i = 0; i < cfg.length; i++) {
            var o = cfg[i]
            if (key == o.key) {
                idx = i
                break
            }
        }

        if (idx >= 0) {
            cfg.splice(idx, 1)
        }
    }

    return {
        add:       addHook,
        remove:    removeHook,
        removeAll: removeAllHooks,
    }
})
