define({

    clone: function deepClone(o) {
        var r, i, keys
        if (o && typeof o == 'object') {
            r = Array.isArray(o) ? [] : {}
            keys = Object.keys(o)
            for (i = 0; i < keys.length; i++) {
                r[keys[i]] = deepClone(o[keys[i]])
            }
        }
        return r || o
    },

    equals: function deepEquals(a, b) {
        if (!a || typeof a != 'object') {
            return a === b
        }
        if (!b || typeof b != 'object' || Array.isArray(a) != Array.isArray(b)) {
            return false
        }
        var ka = Object.keys(a)
        if (ka.length != Object.keys(b).length) {
            return false
        }
        for (var i = 0; i < ka.length; i++) {
            if (!(ka[i] in b)) {
                return false
            }
            if (!deepEquals(a[ka[i]], b[ka[i]])) {
                return false
            }
        }
        return true
    },

})
