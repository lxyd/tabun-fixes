define(['jquery', 'module', 'app', 'basic-cfg-panel-applet', 'img/gear'], function($, Module, App, BasicCfgPanelApplet, imgGear) {

    function CfgPanel() { }

    CfgPanel.prototype = new Module()

    CfgPanel.prototype.attach = function cfgPanel_attach(config) {
        this._collectApplets()

        this._btn = $('<a href="#">').css({
            background: 'url("' + imgGear + '") no-repeat 50% 50%',
            width: 16,
            height: 24,
            display: 'inline-block',
            verticalAlign: 'bottom',
            position: 'relative',
            bottom: -3
        }).on('click', function() {
            if (this._dialog) {
                this._closeDialog()
            } else {
                this._openDialog()
            }
            return false
        }.bind(this))

        $('#widemode').append(this._btn)
    }

    CfgPanel.prototype.detach = function cfgPanel_detach() {
        this._closeDialog()
        this._btn.remove()
        this._btn = null
        return true
    }

    CfgPanel.prototype._collectApplets = function cfgPanel_collectApplets() {
        this._columns = []
        var curColIdx = 1
        this.getApp().getModuleIds().forEach(function(id) {
            var module = this.getApp().getModule(id)
              , params = (module.getInstallParams() || {}).cfgPanel

            if (!params || params.skip) {
                return
            }
            curColIdx = params.column || curColIdx

            var col = this._columns[curColIdx] = this._columns[curColIdx] || []
              , applet
            if (module.createCfgPanelApplet) {
                applet = module.createCfgPanelApplet()
            } else {
                applet = new BasicCfgPanelApplet(module.getLabel())
            }
            col.push({
                id: id,
                module: module,
                applet: applet,
            })
        }, this)
        this._columns = this._columns.filter(function(c) { return c && c.length })
    }

    CfgPanel.prototype._closeDialog = function cfgPanel_closeDialog() {
        this._dialog.remove()
        this._dialog = null
    }

    CfgPanel.prototype._openDialog = function cfgPanel_createUi() {
        this._dialog = $('<div>')
        this._applets = {}
        var tds = []
        this._columns.forEach(function(col, colIdx) {
            col.forEach(function(applet) {
                td = tds[colIdx] = tds[colIdx] || $('<td>')
                this._applets[applet.id] = {
                    id: applet.id,
                    applet: applet.applet,
                    module: applet.module,
                    ui: $(applet.applet.build())
                            .css('margin-bottom', '10px')
                            .appendTo(td),
                }
            }.bind(this))
        }.bind(this))

        this._dialog = $('<div>').attr('id', this.getApp().getId() + '-cfg-panel').css({
            position: 'fixed',
            right: 6,
            bottom: 30,
            width: 450 * tds.length,
            zIndex: 10000,
            background: 'White', // TODO : theme
            border: "1px solid Silver", // TODO : theme
            borderRadius: 6,
            padding: 10
        })
        
        $('<div>').text("Настройки userscript'а TabunFixes").css({
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 15
        }).appendTo(this._dialog)

        var table = $('<table>').css({
            border: "none",
            width: "100%"
        }).appendTo(this._dialog)

        var tr = $('<tr>').appendTo(table)
        var tdCss = {
            padding: '5px',
            verticalAlign: 'top'
        }
        var tdWidth = Math.floor(100 / tds.length) + '%'

        tds.forEach(function(td, i) {
            td.attr('width', tdWidth).css(tdCss).appendTo(tr)
            if (i > 0) {
                td.css('border-left', '1px solid #EEE') // TODO : theme
            }
        }.bind(this))

        var ctlPanel = $('<div>').appendTo(this._dialog)

        $('<a href="#">').text("Сохранить конфигурацию").on('click', function() {
            if (this._saveConfig()) {
                this._closeDialog()
            }
            return false
        }.bind(this)).appendTo(ctlPanel)

        $('<a href="#">').text("Отмена").css('float', 'right').on('click', function() {
            this._closeDialog()
            return false
        }.bind(this)).appendTo(ctlPanel)

        $(document.body).append(this._dialog)

        this._setAppletsData()

        // TODO : highlight dirty modules
    }

    CfgPanel.prototype._setAppletsData = function cfgPanel_setAppletsData() {
        var app = this.getApp()
        for (id in this._applets) {
            var a = this._applets[id]
            a.applet.setData(app.isModuleEnabled(a.module), app.getModuleConfig(a.module))
        }
    }

    CfgPanel.prototype._saveConfig = function cfgPanel_saveConfig() {
        var app = this.getApp()
          , res = true
          , errs = null
          , cfgs = {}
          , enab = {}

        for (id in this._applets) {
            var a = this._applets[id]
            try {
                cfgs[id] = a.applet.getConfig()
                enab[id] = a.applet.getEnabled()
            } catch (err) {
                res = false
                errs = (errs ? errs + "\n" : "") + err.message
            }
        }

        if (!res) {
            alert("Ошибка сохранения конфига" + (errs ? ":\n" + errs : ""))
            return false
        }

        for (id in this._applets) {
            var a = this._applets[id]
            app.setModuleConfig(a.module, cfgs[id])
            app.setModuleEnabled(a.module, enab[id])
        }

        return true
    }

    return CfgPanel

})
