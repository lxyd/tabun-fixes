// a bit of mimic require.js's way to define a module, but
// - no dynamic file loading (!)
// - no module hierarchy supported: module name is interpreted as a plain string
// - no requirejs plugins, no shim etc

var define = (function() {

    var awaiting = {}
      , unresolved = {}
      , modules = {}
      , nextName = null

    /**
     *  Define a module with a given name in a way syntactically close to require.js
     *
     *  Ways to call:
     *
     *  1) define('module-name', ['deps', 'list'], module)
     *  2) define('module-name', module)
     *
     *  3) define('next-module-name', [])   - speciall call with name and no module is
     *                                           meant to be used by a build system to
     *                                           set next-module-name for future calls
     *  4) define(['deps', 'list'], module) - like #1 but using next-module-name as name
     *  5) define(module)                   - like #2 but using next-module-name as name
     *
     */
    function define(name, deps, module) {
        if (typeof name == 'string' && Array.isArray(deps) && !module) {
            nextName = name
            return
        }

        if (typeof name != 'string') {
            if (!nextName) {
                throw new Error("Module name no set. Be sure to pass module name or call define('next-name', []) before defining a module")
            }
            module = deps
            deps = name
            name = nextName
        }

        if (typeof module == 'undefined') {
            module = deps
            deps = null
        }

        if (defined(name) || awaiting[name]) {
            throw new Error("Module '" + name + "' already defined")
        }

        nextName = null // consume next-module-name
        deps = deps || []

        awaiting[name] = {
            deps:   deps,
            module: module,
        }

        deps.forEach(function(d) {
            if (!defined(d)) {
                unresolved[d] = unresolved[d] || []
                unresolved[d].push(name)
            }
        })

        tryToDefineAwaiting(name)
    }

    function tryToDefineAwaiting(name) {
        var m = awaiting[name]
        if (m && m.deps.every(defined)) {
            modules[name] = createModule(m.module, m.deps)
            delete awaiting[name]

            ;(unresolved[name] || []).forEach(tryToDefineAwaiting)
            delete unresolved[name]
        }
    }

    function createModule(module, deps) {
        if (typeof module == 'function') {
            return module.apply(null, deps.map(require))
        } else {
            return module
        }
    }

    function require(name) {
        if (!defined(name)) {
            throw new Error("Module '" + name + "' not defined")
        }
        return modules[name]
    }

    function defined(name) {
        return typeof modules[name] != 'undefined'
    }

    modules['require'] = require

    return define

})()
