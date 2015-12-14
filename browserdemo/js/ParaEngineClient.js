// Title: ParaEngineClient Web Plugin
// Author: LiXizhi, inspired by ParaTsPlayer code that we worked with Edmond and Pierre
// Company: ParaEngine Corporation
// Date: 2010.4.2
// Note: this file requires jquery-1.4.2.js or above in order to work

String.prototype.format = function() {
    var pattern = /\{\d+\}/g;
    var args = arguments;
    return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
}
String.prototype.repeat = function (l) {
    return new Array(l + 1).join(this);
};

// the main game specific UI class
ParaMyGame = {
    // whether we use ParaEngineClient plugin as the loader
    isParaEngineClient: true,
    // true to automatically start the redist if already installed. otherwise, we will show an element with class ManualStartContentPath
    isAutoStart: true,
    // the jquery path of elements to show when isAutoStart is false. Initially should be hidden.
    ManualStartShowContentPath: ".pe-start-show-redist",
    // the jquery path of elements to hide when isAutoStart is false. Initially should be shown.
    ManualStartHideContentPath: ".pe-start-hide-redist",
    // whether to show debug output
    bShowDebugger: false,
    // set this to true to show intro page, not all browsers are supported. 
    bShowIntroPage: false,
    // set this to true to pause at intro page for debugging. 
    bDebugIntroPage: false,
    // if true, we will automatically show the game window when update complete. If false, we will wait for game message to show.
    bAutoShowGameWindow: true,
    // true to enter the game after updating the game, false to let the user manually enter the game.
    isAutoEnterGame: true,
    // the jquery path for the fallback content, we will auto show/hide during DOM ready according to whether plugin is installed or not.  
    fallbackContentPath: ".pe-player-fallback",
    // the jquery path for showing the more than one instance error message
    oneInstanceContentPath: ".pe-player-oneinstance",
    // current game loading progress
    progress: 0,
    // private: we will prevent any change resolutions calls until window is shown for the first time. 
    is_3dwindow_shown: false,
    // how many milliseconds to wait before game window is shown. 
    loaderDelayTime: 2000,
    plugin_width: 960,
    plugin_height: 560,
    // a function that is called when the game loader is first shown.
    OnShowGameLoader: null,
    // a function that is called when the background game process has prepared all initial assets and ready to show. 
    // one can set isAutoEnterGame to false, and use this callback function to show the game window.
    OnPreloaderReady: null,
    // get url params
    urlParam: function (name) {
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results[1] || 0;
    },
    /** call this function to start downloading the redist. */
    StartFileRedistInstall: function () {
        location.href = ParaWebPlugin.redistInstallUrl;
    },
    // get cookie
    getCookieString: function (name) {
        var text = document.cookie;
        var cookies = {};
        if (text && text.length > 0) {
            if (/[^=]+=[^=;]?(?:; [^=]+=[^=]?)?/.test(text)) {
                var cookieParts /*:Array*/ = text.split(/;\s/g),
                    cookieName /*:String*/ = null,
                    cookieValue /*:String*/ = null,
                    cookieNameValue /*:Array*/ = null;

                for (var i = 0, len = cookieParts.length; i < len; i++) {

                    //check for normally-formatted cookie (name-value)
                    cookieNameValue = cookieParts[i].match(/([^=]+)=/i);
                    if (cookieNameValue instanceof Array) {
                        try {
                            cookieName = decodeURIComponent(cookieNameValue[1]);
                            cookieValue = decodeURIComponent(cookieParts[i].substring(cookieNameValue[1].length + 1));
                        } catch (ex) {
                            //ignore the entire cookie - encoding is likely invalid
                        }
                    } else {
                        //means the cookie does not have an "=", so treat it as a boolean flag
                        cookieName = decodeURIComponent(cookieParts[i]);
                        cookieValue = cookieName;
                    }
                    cookies[cookieName] = cookieValue;
                }
            }
        }

        return cookies[name];
    },

    // get url request parameter
    getRequestParameter: function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return "";
        else
            return results[1];
    },


    // update the Main 3d window size
    updateSize: function (x, y) {
        if (!ParaMyGame.is_3dwindow_shown) {
            // this may fix a bug to update window size twice on low end computer during first time loading, causing IE6 to crash sometimes
            ParaWebPlugin.WriteToOutput("update Size is ignored since window is not shown yet");
            return;
        }
        if (ParaMyGame.plugin_width == x && ParaMyGame.plugin_height == y)
            return;
        ParaMyGame.plugin_width = x;
        ParaMyGame.plugin_height = y;
        ParaWebPlugin.WriteToOutput("update Size {0}x{1}".format(x, y));

        var c = $("#container");
        // gather container data
        var bl = parseInt(c.css("borderLeftWidth"), 10) || 0;
        var br = parseInt(c.css("borderRightWidth"), 10) || 0;
        var ml = parseInt(c.css("marginLeft"), 10) || 0;
        var mr = parseInt(c.css("marginRight"), 10) || 0;
        var bt = parseInt(c.css("borderTopWidth"), 10) || 0;
        var bb = parseInt(c.css("borderBottomWidth"), 10) || 0;
        var mt = parseInt(c.css("marginTop"), 10) || 0;
        var mb = parseInt(c.css("marginBottom"), 10) || 0;

        // resize the player
        if (this.isParaEngineClient) {
            var _p = ParaWebPlugin.plugin();
            if (_p) {
                _p.width = x;
                _p.height = y;
            }
        }

        // resize the container
        c.width(x);
        c.height(y);

        // resize and re-position the main block
        var m = $("#main");
        var mainWidth = x + bl + br + ml + mr;
        var mainHeight = y + bt + bb + mt + mb;
        m.width(mainWidth);
        m.height(mainHeight);
        m.css("position", "relative");
        m.css("left", "50%");
        m.css("marginLeft", "-{0}px".format(mainWidth / 2));
    },

    // display the 3d screen resizer buttons
    ShowResizer: function () {
        var that_ = this;
        $(".screenresizer").show();
        $("a.res").click(function () {
            var b = this;
            var r = b.title;
            var s = r.split(":");
            var w = parseInt(s[0], 10);
            var h = parseInt(s[1], 10);
            that_.updateSize(w, h);
            var date = new Date();
            date.setMonth(date.getMonth() + 1);
            document.cookie = "size=" + r + ";expires=" + date.toGMTString();
        });
    },
    /** set progress bar width and text
    * @param progress: if (0,1), it is percentage. if > 1, it will add to current progress. If undefined, progress is not increased. 
    * @param progress_text: the text to display inside the bar. if undefined, old value is retained. 
    * @param bHalt: nil or boolean. True to halt the progress, and the percentage text is not appended
    */
    SetProgress: function (progress, progress_text, bHalt) {

        if (progress != undefined) {
            if (progress <= 1) {
                this.progress = progress;
            }
            else {
                this.progress += progress / 100;
                if (this.progress >= 1)
                    this.progress = 1;
            }
            // the width is 310 pixels, change this value in case the layout changes.
            // Note: the code here will crash IE6 now and then for unknown reasons.
            //$("#progressbar").width(parseInt(this.progress * 310, 10) || 0);
            if (progress_text == undefined) {
                progress_text = "正在更新, 请稍候..";
            }
            if (bHalt == null) {
                progress_text += "..[" + parseInt(this.progress * 100) + "%]";
            }
        }
        if (progress_text != undefined) {
            $("#loader_progress_text").html(progress_text);
        }
    },
    /** show intro page in case 
    * @param initialPage: url of the init page. 
    */
    ShowIntroPage: function (initialPage) {
        if (this.bShowIntroPage) {
            if (initialPage == undefined) {
                // TODO: shall we pick a random slide show page to display here?
                initialPage = "introIndex.html";
                //initialPage = "haqifiles/intro1.html";
            }
            $('.ezjax').ezjax({
                container: '#ezjax_content',
                initial: initialPage,
                effect: 'slide',
                easing: 'easeOutBounce',
                bind: 'a'
            });
        }
    },
    /** set loading text below the progress bar. */
    SetLoadingText: function (loading_text) {
        $("#loading_text").html(loading_text);
    },
    /** For testing only: Say Hello To Game Engine */
    SayHello: function (text) {
        ParaWebPlugin.NPLActivate("alert", "msg={say_hello=1}", 1);
    },
    /** Set initial window size */
    SetInitialWindowSize: function (width, height) {
        ParaMyGame.initial_width = width;
        ParaMyGame.initial_height = height;
    },
    /** show the game window and related divs such as resizer. it will also hide the js loader div.*/
    ShowGameWindow: function (bFirstTime) {
        ParaMyGame.is_3dwindow_shown = true;
        if (bFirstTime) {
            var nPlayerWidth = ParaMyGame.initial_width;
            var nPlayerHeight = ParaMyGame.initial_height;

            if (nPlayerWidth == null || nPlayerHeight == null) {
                var strSize = ParaMyGame.getCookieString("size");
                if (strSize && strSize.length > 0) {
                    var _s = strSize.split(":");
                    nPlayerWidth = parseInt(_s[0], 10) || 960;
                    nPlayerHeight = parseInt(_s[1], 10) || 560;
                }
            }

            if (nPlayerWidth && nPlayerHeight) {
                if (nPlayerWidth < 400)
                    nPlayerWidth = 400;
                if (nPlayerHeight < 200)
                    nPlayerHeight = 200;
                ParaMyGame.updateSize(nPlayerWidth, nPlayerHeight);
            }
        }
        ParaWebPlugin.ShowWindow(true);
        $("#gameloader").hide();
        $("#installguide").hide();
        ParaMyGame.ShowResizer();
    },
    // show the game loader.
    ShowGameLoader: function (paraplugin) {
        var that_ = this;
        paraplugin.log("Game Loader is shown");
        $("#gameloader").show();
        $("#installguide").hide();
        if (that_.OnShowGameLoader != null) {
            that_.OnShowGameLoader();
        }
        that_.SetProgress(0, "正在更新Paracraft...");
        // at least wait 2 seconds before displaying the game window.
        ParaWebPlugin.loaderDelayTime = that_.loaderDelayTime;

        paraplugin.addEvent(function (msg_type, param1, param2, nType, sCode) {
            switch (msg_type) {
                case "updt.b":
                    that_.SetProgress(0, "更新时中途遇到网络问题，请尝试点击F5刷新页面", true);
                    break;
                case "updt.u":
                    that_.SetProgress(0, "无法确认您是否在使用最新的版本", true);
                    break;
                case "updt.s":
                    that_.SetProgress(2, "正在更新游戏...");
                    // start intro slide show
                    that_.ShowIntroPage();
                    break;
                case "updt.p":
                    that_.SetProgress(0.1 + param1 / (param2 + 1) * 0.7, "下载{0}/{1}KB".format(parseInt(param1 / 1000), parseInt(param2 / 1000)));
                    break;
                case "updt.c":
                    that_.SetProgress(5, "更新完成!");
                    break;
                case "updt.n":
                    that_.SetProgress(50, "没有新版本, 更新完成!");
                    break;
                case "dl.p":
                    // redist download progress
                    that_.SetProgress(0.1 + param1 / (param2 + 1) * 0.7, "下载安装包{0}/{1}KB".format(parseInt(param1 / 1000), parseInt(param2 / 1000)));
                    break;
                case "dl.f":
                    if (param1 == -2147467260) {
                        that_.SetProgress(0, "您的用户权限不够，请点击<a href='{0}'>这里</a>手工下载播放器".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("选择运行,安装完毕后,请关闭浏览器并重新启动");
                    }
                    else if (param1 == -2147024891) {
                        that_.SetProgress(0, "3D播放器升级了，请点击<a href='{0}'>这里</a>重新下载安装".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("选择运行,安装完毕后,请关闭浏览器并重新启动");
                    }
                    else {
                        that_.SetProgress(0, "安装包中途遇到网络问题，请点击<a href='{0}'>这里</a>手工下载".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("代号{0}. 安装完毕后,请关闭浏览器并重新启动".format(param1));
                    }
                    if (!($.browser.msie)) {
                        // display download after 2 seconds (this fixed an issue where html images does not show up under chrome, safari)
                        setTimeout(that_.StartFileRedistInstall, 2000);
                    }
                    break;
                case "dl.c":
                    // download completed
                    that_.SetProgress(2, "安装包下载完成! 正在执行安装请稍候.", true);
                    break;
                case "it.c":
                    if (param1 == 0) {
                        that_.SetProgress(2, "安装完成! 请稍候.", true);
                    }
                    else if (param1 == -10) {
                        that_.SetProgress(0, "安装包版本不对! 请点击<a href='{0}'>这里</a>手工安装播放器".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("代号{0}. 安装完毕后,请关闭浏览器并重新启动".format(param1));
                    }
                    else { // if(param1 == -2){
                        that_.SetProgress(0, "您的用户权限不够! 请点击<a href='{0}'>这里</a>手工安装播放器".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("代号{0}. 安装完毕后,请关闭浏览器并重新启动".format(param1));
                    }
                    break;
                case "pe.p":
                    if (param1 <= 1) {
                        that_.SetProgress(5, "正在加载ParaEngine 3D引擎...");
                    }
                    else if (param1 == 2) {
                        that_.SetProgress(5, "正在初始化...");
                    }
                    else if (param1 == 3) {
                        // ParaEngine Loading Completed:
                        if (that_.isAutoEnterGame) {
                            that_.SetProgress(5, "正在登录游戏, 请稍候...");
                        }
                        if (param2 != "pending") {
                            if (that_.bDebugIntroPage) {
                                that_.SetProgress(5, "bDebugIntroPage: disable this at release time");
                                return;
                            }
                            if (that_.bAutoShowGameWindow && that_.isAutoEnterGame) {
                                that_.ShowGameWindow(true);
                            }
                        }
                    }
                    break;
                case "change_resolution": // from game app
                    var date = new Date();
                    date.setMonth(date.getMonth() + 1);
                    document.cookie = "size={0}:{1};expires={2}".format(param1, param2, date.toGMTString());
                    ParaMyGame.updateSize(param1, param2);
                    break;
                case "multi_instance": // using is running multiple instances
                    if (param1 == "ask_multiple_instance") {
                        that_.SetProgress(5, "发现你在运行多个游戏，请选择'是'", true);
                    }
                    else if (param1 == "force_close_succeed") {
                        that_.SetProgress(5, "正在初始化...");
                    }
                    else if (param1 == "force_close_failed") {
                        that_.SetProgress(5, "关闭失败了, 请手工关闭游戏, 再F5刷新页面", true);
                    }
                    else if (param1 == "force_close_start") {
                        that_.SetProgress(5, "正在自动关闭其它他游戏, 请耐心等待.");
                    }
                    else if (param1 == "please_manually_close") {
                        that_.SetProgress(5, "请关闭其他正在运行的游戏，再重启浏览器", true);
                    }
                    break;
                case "restart_game": // from game app
                    // refresh the page
                    setTimeout(function () { window.location.reload(false); }, 3000);
                    break;
                case "exit_game": // from game app
                    // redirect the page
                    setTimeout(function () { window.close(); }, 1000);
                    break;
                case "preloader": // from game app
                    if (param2 == 1) {
                        if (that_.bDebugIntroPage) {
                            that_.SetProgress(5, "bDebugIntroPage: disable this at release time");
                            return;
                        }
                        if (that_.OnPreloaderReady != null) {
                            that_.OnPreloaderReady();
                        }
                        if (that_.isAutoEnterGame) {
                            that_.ShowGameWindow(true);
                        }
                    }
                    else {
                        // Note: sCode is utf8 text tips passed from ParaEngine, however IE seems to display wrong characters, so I just replace it with an ordinary string. 
                        sCode = "正在更新游戏, 请耐心等待...";
                        that_.SetProgress(param1 / 100, sCode);
                    }
                    break;
                case "err": // log or error message
                    if (param2 != 1000) {
                        that_.SetProgress(0, "无法自动安装! 请点击<a href='{0}'>这里</a>手工安装播放器".format(ParaWebPlugin.redistInstallUrl), true);
                        that_.SetLoadingText("原因:{0}{1}".format(param1, param2 || ""));
                    }
                    break;
            }
        });
    },

    // called when DOM is ready
    OnDOMReady: function () {
        var that_ = ParaMyGame;

        
        if (that_.getRequestParameter("raw") == "on") {
            $('.deco').hide();
        }
        if (that_.getRequestParameter("debug") == "on") {
            $('#output').show();
        }

        var uid = that_.getRequestParameter("uid");
        if (uid != "") {
            ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params_default + "uid=\"{0}\"".format(uid);
        }
        else {
            ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params_default;
        }
        // force paracraft
        ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params + " mc=\"true\"";

        var region = that_.getRequestParameter("region");
        if (region != "") {
            ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params + " region=\"{0}\"".format(region);
        }

        var partner = that_.getRequestParameter("partner");
        if (partner != "") {
            ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params + " partner=\"{0}\"".format(partner);
        }

        ParaWebPlugin.cmd_params = ParaWebPlugin.cmd_params + " url=\"{0}\"".format(window.location.href);
        
        that_.bShowDebugger = that_.bShowDebugger || (that_.getRequestParameter("debug") == "true");

        if (that_.bShowDebugger) {
            ParaWebPlugin.enableDebugOutput = true;
            $('.debugger').show();
        }

        // toggle IE and Non-IE specific blocks.
        if (($.browser.msie)) {
            $('.nonmsie').hide();
            $('.msie').show();
        }
        else {
            $('.msie').hide();
            $('.nonmsie').show();
        }
        // disable backspace key
        ParaWebPlugin.DisableSharedKeys();

        // update the main window size according to cache. 
        var nPlayerWidth = 960;
        var nPlayerHeight = 560;

        // monitor plugin install status
        var bIsInstalled = ParaWebPlugin.MonitorInstalled();

        // add the ParaEngine plugin object, regardless of whether the plugin is installed or not. 
        var paraplugin = ParaWebPlugin.addObject("container", "paraplugin", nPlayerWidth, nPlayerHeight);

        // check if ParaWebPlugin is installed at page loading time. 
        if (bIsInstalled && paraplugin != undefined) {
            // this.isParaEngineClient specify which redist plugin to use. 
            if (that_.isAutoStart) {
                if (that_.isParaEngineClient) {
                    // now start the ParaEngineClient redist
                    if (paraplugin.start("ParaEngineClient", "")) {
                        $(that_.fallbackContentPath).hide();
                        that_.ShowGameLoader(paraplugin);
                    }
                }
            }
            else {
                $(that_.ManualStartHideContentPath).hide();
                $(that_.ManualStartShowContentPath).show();
            }
        }
        else {
            $(that_.fallbackContentPath).show();
            // for non-ie browser start file downloading immediately. 
            if (!($.browser.msie)) {
                // display download after 2 seconds (this fixed an issue where html images does not show up under chrome, safari)
                setTimeout(that_.StartFileRedistInstall, 2000);
            }
        }
    }
}

/** This is a common helper class for ParaWebPlugin(npParaEngineWebPlugin.dll)
* it manages plugin version and redist version, install status monitoring, debugging output and plugin event handling
* One may need to modify the class properties to match your redist or plugin version.
* Compati: tested on IE 6/7/8, FF 3, Chrome. 
*/
ParaWebPlugin = {
    // modify to change the IE cab file code base url and version, only trusted domain is accepted. "http://pedn.paraengine.com/webplayer/ParaEngineWebPlugin.cab#version=1,0,0,1"
    pluginCodeBase: "",
    // redist name
    redistName: "ParaEngineClient",
    // the redist must match this version in order to be started successfully. 
    redistVersion: "1003",
    // the redist URL, only trusted domain is accepted. 
    redistInstallUrl: "http://haqi.61.com/webplayer/RedistParaEnginePlayer1003.exe",
    // the plugin().version property must match this in order to proceed. 
    pluginVersion: "1.0.2",
    // the url for auto updater. Only trusted domain are accepted
    updateurl: "http://update.61.com/haqi/coreupdate/;http://tmlog.paraengine.com/;http://tmver.pala5.cn/;",
    // the local app folder. Only trusted folder is accepted
    app_dir: "TaoMee/Haqi",
    // additional command line to pass to the executable. must be in name value pairs like "uid=\"1234\""
    cmd_params_default: "",
    cmd_params: "",
    // true to write output to <div id="output">
    enableDebugOutput: true,
    // the default plugin id
    pluginid: "paraplugin",
    // whether plugin is installed on the machine. But it does not mean the user has enabled it.
    bInstalled: false,
    // max line count in debug output    
    maxOutputLineCount: 90,
    // how many milliseconds to wait to display the game window after the loading complete message is received. If 0, it will show the window immediately.
    // if now, it will send two "pe.p" param1==3, message, where the first param2="pending", and the second if when window is shown. 
    loaderDelayTime: 0,
    // whether redist is successfully loaded. 
    redist_loaded: false,
    // this function is called when the monitor checks that the redist is already installed.
    OnRedistInstalled: function () {
        // refresh the page
        window.location.reload(false);
    },
    /** get the plugin element. */
    plugin: function plugin() {
        return document.getElementById(ParaWebPlugin.pluginid);
    },
    // current line count in debug output    
    outputLineCount: 0,
    WriteToOutput: function (msg) {
        if (this.enableDebugOutput) {
            var outputDiv = document.getElementById('output');
            if (outputDiv) {
                if (this.outputLineCount > this.maxOutputLineCount) {
                    this.outputLineCount = 1;
                    outputDiv.innerHTML = msg + "<br/>";
                }
                else {
                    this.outputLineCount += 1;
                    outputDiv.innerHTML += msg + "<br/>";
                }
            }
            else {
                this.enableDebugOutput = false;
            }
        }
    },
    /* activate a given NPL file in the game engine. This function can only be called when redist loading is completed. 
    * @param filename: the npl file to be activated. this file must be trusted by the client in order to be activated. 
    * @param sCode: any string sCode, if it "msg={...}", then it is a table. 
    * @param nParam1: optional double value to send 
    * @param nParam2: optional double value to send 
    */
    NPLActivate: function (filename, sCode, nParam1, nParam2) {
        if (ParaWebPlugin.redist_loaded) {
            var p = ParaWebPlugin.plugin();
            if (p) {
                return p.SendRedistMsg(9, nParam1 || 0, nParam2 || 0, filename || "", sCode || "", 0);
            }
        }
        return false;
    },
    /** how many instances of this plugin is created in this process*/
    GetInstanceCount: function () {
        var p = ParaWebPlugin.plugin();
        if (p) {
            if (p.instanceCount != undefined) {
                return p.instanceCount;
            } else {
                return 1;
            }
        } else {
            return 0;
        }
    },
    /** create ParaEngine web plugin object and append it to a parent element.
    * @param containerID: id of the parent container div, such as "container"
    * @param id: element id. If there is already an element in HTML, we will use it directly. 
    * @param width,height: integer. 
    * @return the plugin element.
    */
    addObject: function (containerID, id, width, height) {
        var that_ = this;

        // create object if not already in DOM
        var p_ = document.getElementById(id);
        if (!p_) {
            // create the window at super negative position. 
            // Note: This does not work in IE 8, but works in FF, chrome, etc. For IE, we need to create in HTML beforehand.
            var p_ = $('<object style="position:relative;top:-2000px" id="{0}" type="application/x-paraenginewebplugin" codebase="{1}" width="{2}" height="{3}"></object>'.format(id, this.pluginCodeBase, width, height));
            $("#" + containerID).append(p_);
        }

        this.pluginid = id;
        var pluginElement = document.getElementById(id);
        if (!pluginElement) {
            return;
        }
        var pluginExtension = {
            addEvent: function (func) {
                that_.onpluginmsgCallback = func;
            },
            addEvent_: function (name, func) {
                // working on IE9 now
                if (window.attachEvent) {
                    pluginElement.attachEvent("on" + name, func);
                } else {
                    pluginElement.addEventListener(name, func, false);
					pluginElement["on" + name] = func; // fix IE 11 
                }
            },
            log: function (msg) {
                that_.WriteToOutput(msg);
            },
            getElement: function () {
                return pluginElement;
            },
            /**
            @return: true succeed, false plugin version does not match. 
            */
            start: function (redistName, version) {
                if (!that_.bInstalled || pluginElement.version == undefined) {
                    that_.WriteToOutput("you can not call plugin.start(), if plugin is not installed or enabled.yet.");
                    return;
                }
                that_.WriteToOutput("plugin version:" + pluginElement.version);
                if (pluginElement.version != that_.pluginVersion) {
                    that_.WriteToOutput("warning: plugin version is {0}, however {1} should be installed".format(pluginElement.version, that_.pluginVersion));
                }
                if (redistName == "ParaEngineClient") {
                    // here we provide an example to log all supported plugin message. 
                    // A custom loader should addEvent and implement UI accordingly. Please see ParaMyGame for an example.
                    this.addEvent_('pluginmsg', function (msg_type, param1, param2, nType, sCode) {
                        var that_ = ParaWebPlugin;
                        switch (msg_type) {
                            case "updt.b":
                                that_.WriteToOutput("Some files failed to be downloaded. Please press F5 to try again");
                                break;
                            case "updt.u":
                                that_.WriteToOutput("Unknown updater error, perhaps version does not exist");
                                break;
                            case "updt.s":
                                that_.WriteToOutput("Updating Game Files...");
                                break;
                            case "updt.p":
                                var text = "downloading {0}/{1}".format(param1, param2);
                                that_.WriteToOutput(text);
                                break;
                            case "updt.c":
                                that_.WriteToOutput("autoupdate completed.");
                                break;
                            case "updt.n":
                                that_.WriteToOutput("no version changes detected. Update completed.");
                                break;
                            case "dl.p":
                                // redist download progress
                                that_.WriteToOutput("redist downloading {0}/{1}".format(param1, param2));
                                break;
                            case "dl.f":
                                that_.WriteToOutput("redist downloading failed {0} {1}".format(param1, param2));
                                that_.WaitForRedistInstallCompletion();
                                break;
                            case "dl.c":
                                // download completed
                                that_.WriteToOutput("downloading completed {0}".format(param1));
                                that_.redistCachePath = param1;
                                if (pluginElement.InstallRedist("ParaEngineClient", param1, "/S", false)) {
                                    that_.WriteToOutput("Begin installing " + param1);
                                }
                                else {
                                    setTimeout(function () {
                                        that_.WriteToOutput("Redist can not be trusted to install");
                                        if (that_.onpluginmsgCallback) {
                                            that_.onpluginmsgCallback("it.c", -11, 0);
                                        }
                                    }, 1000);
                                }
                                break;
                            case "it.c":
                                {
                                    var bIsRedistInstalled = that_.WaitForRedistInstallCompletion();
                                    if (param1 == 0) {
                                        that_.WriteToOutput("install completed");

                                        // check now and every 4 seconds.
                                        if (bIsRedistInstalled) {
                                            if (typeof (pluginElement.releaseInstance) != 'undefined') {
                                                pluginElement.releaseInstance();
                                            }
                                            // refresh the page
                                            window.location.reload(false);
                                        }
                                        else {
                                            that_.WriteToOutput("wrong installer used. the redist version is not up-to-date");
                                            param1 = -10;

                                        }
                                    }
                                    else {
                                        if (param1 == -2) {
                                            that_.WriteToOutput("install failed: possibly the user firewall app blocks running the exe");
                                        }
                                        else {
                                            that_.WriteToOutput("install failed");
                                        }

                                    }
                                    if (!bIsRedistInstalled) {
                                        if (pluginElement != undefined && that_.redistCachePath != undefined && typeof (pluginElement.ShellExecuteRedist) != undefined) {
                                            // try again without /S command line.
                                            if (!pluginElement.ShellExecuteRedist(that_.redistName, that_.redistCachePath, "")) {
                                                that_.WriteToOutput("shell execute failed");
                                            }
                                        }
                                    }
                                }
                                break;
                            case "pe.p":
                                that_.WriteToOutput("paraengine progress {0} {1}".format(param1, param2));
                                if (param1 == 3) {
                                    that_.redist_loaded = true;
                                    if (that_.loaderDelayTime == undefined || that_.loaderDelayTime == 0) {
                                        //that_.ShowWindow(true);
                                    }
                                    else {
                                        setTimeout(function () {
                                            that_.WriteToOutput("delayed loader completed");
                                            //that_.ShowWindow(true);
                                            // call event custom callbacks
                                            if (that_.onpluginmsgCallback) {
                                                that_.onpluginmsgCallback("pe.p", 3, "game loop started");
                                            }
                                        }, that_.loaderDelayTime);
                                        param2 = "pending";
                                    }
                                }
                                break;
                            case "log":
                                that_.WriteToOutput(param1);
                                break;
                            case "err": // log or error message
                                that_.WriteToOutput("error:" + param1);
                                if (param2 == 1000) {
                                    if (that_.onpluginmsgCallback) {
                                        that_.onpluginmsgCallback("multi_instance", param1, 0);
                                    }
                                }
                                break;
                            case "timer": // on timer, at 1 FPS
                                // that_.WriteToOutput(param1); 
                                break;
                            case "alert":
                                // this is an alert NPL message from the game engine
                                alert(sCode);
                                break;
                            default:
                                // custom messages
                                that_.WriteToOutput("msg rev:{0} p1:{1} p2:{2} code:{3}".format(msg_type, param1 || 0, param2 || 0, sCode || ""));
                                break;
                        }
                        // call event custom callbacks
                        if (that_.onpluginmsgCallback) {
                            that_.onpluginmsgCallback(msg_type, param1, param2, nType, sCode);
                        }
                    }
                    );
                    var redistVer = pluginElement.GetRedistVersion(redistName, "");
                    that_.WriteToOutput("redist Version:" + redistVer);
                    if ((version != "" && redistVer != version) || (version == "" && redistVer != that_.redistVersion)) {
                        that_.WriteToOutput("Redist version is {0}, however {1} should be installed".format(redistVer, version == "" ? that_.redistVersion : version));
                        var currentVersion = parseInt(redistVer) || 0;
                        var requiredVersion = parseInt(that_.redistVersion) || 0;
                        if (currentVersion < requiredVersion) {
                            // download and install latest redist automatically here. 
                            that_.WriteToOutput("downloading redist from {0}".format(that_.redistInstallUrl))
                            pluginElement.DownloadRedist("ParaEngineClient", that_.redistInstallUrl, true);
                            return true;
                        }
                    }
                    var redist_player_path = pluginElement.GetAbsRedistFilePath("ParaEngineClient", "ParaEngineClient.exe");

                    if (pluginElement.StartRedist("ParaEngineClient", redist_player_path, "single=\"false\" minwidth=\"{0}\" minheight=\"{1}\" app_dir=\"{2}\" updateurl=\"{3}\" {4}".format(960, 560, that_.app_dir || "", that_.updateurl || "", that_.cmd_params || ""), 1)) {
                        that_.WriteToOutput("ParaEngineClient is started");
                        return true;
                    }
                } //if(redistName == "ParaEngineClient")
            }
        };
        // $.extend(pluginExtension, pluginElement);
        return pluginExtension;
    },
    /** call this to disable backspace keys, etc. */
    DisableSharedKeys: function () {
        // function to possibly override keypress
        var trapfunction = function (event) {
            var keynum;
            if (window.event)// eg. IE
            {
                keynum = window.event.keyCode;
            }
            else if (event.which) // eg. Firefox
            {
                keynum = event.which;
            }

            if (keynum == 8) // backspace has code 8
            {
                ParaWebPlugin.WriteToOutput("Backspace pressed");
                return false; // nullifies the backspace
            }
            return true;
        }
        document.onkeyup = function (event) { return true; };
        document.onkeydown = trapfunction; // IE, Firefox, Safari
        document.onkeypress = trapfunction; // only Opera needs the backspace nullifying in onkeypress
    },
    /** show hide the main plugin window*/
    ShowWindow: function (bShow) {
        // ParaEngine Loading Completed: show the plugin and hide the loader
        var p = $("#" + ParaWebPlugin.pluginid);
        p.css("position", "relative");
        if (bShow == undefined || bShow) {
            ParaWebPlugin.WriteToOutput("show window");
            p.css("top", "0px");
        }
        else {
            ParaWebPlugin.WriteToOutput("hide window");
            p.css("top", "-2000px");
        }
    },
    IsInstalled: function (abRefresh) {
        abRefresh = (abRefresh != undefined) || true;
        var o;
        try {
            // IE
            o = new ActiveXObject("ParaEngine.ParaEngineWebPlugin");
        } catch (e) {
            // Others
            // refresh the list of plugins manually
            navigator.plugins.refresh();
            var type = "application/x-paraenginewebplugin";
            var mimeTypes = navigator.mimeTypes;
            o = (mimeTypes && mimeTypes[type] && mimeTypes[type].enabledPlugin);
        }
        ParaWebPlugin.bInstalled = (!((!o) || (o == undefined)));
        return ParaWebPlugin.bInstalled;
    },
    /** monitor if plugin is installed. if not, we will start a timer that monitors install completion and refresh the page
    * @return true if already installed
    */
    MonitorInstalled: function () {
        var bInstalled = ParaWebPlugin.IsInstalled();
        if (!bInstalled) {
            ParaWebPlugin.WriteToOutput("Plugin not installed. Monitor is started.");
            ParaWebPlugin.WaitForInstallCompletion();
        }
        return bInstalled;
    },
    /** Checks every 3 seconds if the plugin is installed */
    WaitForInstallCompletion: function () {
        if (ParaWebPlugin.IsInstalled()) {
            if (ParaWebPlugin.OnRedistInstalled != null) {
                ParaWebPlugin.OnRedistInstalled();
            }
        }
        else {
            // check if installed 3 seconds later
            setTimeout(ParaWebPlugin.WaitForInstallCompletion, 3000);
        }
    },
    /** Checks now and every 3 seconds if the required redist is installed. only call this function when plugin is already installed. 
    * return true if the first check ensures that the correct redist is installed. 
    */
    WaitForRedistInstallCompletion: function () {
        var p = ParaWebPlugin.plugin();
        var redistVer = p.GetRedistVersion(ParaWebPlugin.redistName, "");
        if (redistVer == ParaWebPlugin.redistVersion) {
            // refresh the page
            window.location.reload(false);
            return true;
        }
        else {
            // check if installed 3 seconds later
            setTimeout(ParaWebPlugin.WaitForRedistInstallCompletion, 3000);
            return false;
        }
    },
    /** uninstall the plugin or redist */
    UnInstall: function (redistName) {
        var p = ParaWebPlugin.plugin();
        if (p.version != undefined) {
            p.Uninstall(redistName);
        }
        else {
            alert("你没有安装最新的播放器, 无法卸载");
        }
    }
}
// in case, <object> is embedded in html, we should monitor before DOM is ready. 
ParaWebPlugin.MonitorInstalled();