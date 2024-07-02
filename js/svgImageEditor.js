var ImageEditor = {
    Views: {},
    Models: {},
    Collections: {},
    Helpers: {}
};

//ImageEditor: 就是workarea,使用data數據去跑出畫布

/**
 * detect IE
 * returns version of IE or false, if browser is not Internet Explorer
 */
function detectIE() {
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number

        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');

        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
        // IE 12 (aka Edge) => return version number

        return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    // other browser
    return false;
}

$(function () {

    //to add a function templateHelper in the ImageEditor.Helpers
    ImageEditor.Helpers.templateHelper = function (id) {
        return _.template($("#" + id).html());
    };


    //Backbone.js
    ImageEditor.SvgBackboneView = Backbone.View.extend({
        nameSpace: "http://www.w3.org/2000/svg",
        _ensureElement: function () {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                var $el = $(window.document.createElementNS(_.result(this, 'nameSpace'), _.result(this, 'tagName'))).attr(attrs);
                this.setElement($el, false);
            } else {
                this.setElement(_.result(this, 'el'), false);
            }
        }
    });

    /************************************************************************************
     HELPERS
     *************************************************************************************/

    ImageEditor.Helpers.createSvgElement = function (tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    };

    ImageEditor.Helpers.radians = function (degrees) {
        return degrees * Math.PI / 180;
    };

    ImageEditor.Helpers.degrees = function (radians) {
        return radians * 180 / Math.PI;
    };

    ImageEditor.Helpers.getQuadrantNumber = function (x, y) {
        if (x >= 0 && y >= 0) {
            return 1;
        } else if (x < 0 && y >= 0) {
            return 2;
        } else if (x < 0 && y < 0) {
            return 3;
        } else {
            return 4;
        }
    };

    //rotate can delete
    ImageEditor.Helpers.rotatePointAroundOrigin = function (originX, originY, x, y, angleInRadians) {
        var sin = Math.sin(angleInRadians);
        var cos = Math.cos(angleInRadians);
        var newX = originX + (cos * (x - originX) - sin * (y - originY));
        var newY = originY + (sin * (x - originX) + cos * (y - originY));
        return { x: newX, y: newY };
    };

    //What is phantomSize???
    ImageEditor.Helpers.getSize = function (text, fontSize, font) {
        var phantom = $("span#phantomSize");
        if (!phantom.length) {
            phantom = $('<span id="phantomSize">' + text + '</span>')
                .css({
                    'vsibility': 'hidden', 'position': 'absolute',
                    'left': '-9999px', 'display': 'inline'
                }).appendTo(document.body);
        } else {
            phantom.html(text);
        }
        phantom.css({ 'font-size': fontSize, 'fontFamily': font })
        return { width: phantom.width(), height: phantom.height() };
    };

    ImageEditor.Helpers.getSize2 = function (str, fontSize, font, width, height, lineHeight, extraClass, textAlign) {

        if (str == '') return { $el: $(), fontSize: fontSize };

        //为 IE 浏览器将所有字符包裹在 span 标签中
        function wrap(str) {
            var result = '';
            _.each(str, function (char) {
                result = result + '<span class="letter">' + char + '</span>';
            });
            return result;
        }

        str = wrap(str);

        //创建一个虚拟容器 把文字包到span
        var phantom = $("span#phantomSize2");

        if (!phantom.length) {
            phantom = $('<span id="phantomSize2">' + str + '</span>').appendTo(document.body);
        } else {
            phantom.html(str);
        }

        //Adding additional classes for margins. 但我找不到extraClass???
        phantom.removeAttr('class').addClass(extraClass);

        //Setting the styles.
        phantom.css({
            'vsibility': 'hidden',
            //'position':'relative',
            'position': 'absolute',
            'left': '-9999px', 'top': '-9999px',

            'width': width + 'px',
            'min-height': height + 'px',

            'display': 'inline-block',
            'box-sizing': 'border-box',
            'line-height': lineHeight,
            'white-space': 'pre-line',
            'font-size': fontSize, 'fontFamily': font, 'text-align': textAlign
        });

        //  Defining the lines.
        var line = 0;
        var top = 999;
        $('span.letter', phantom).each(function () {
            if (top != $(this).position().top) {
                line++;
                top = $(this).position().top;

                $(this).wrap('<span class="lines line-' + line + '"></span>');
            } else {
                $(this).appendTo('span.lines.line-' + line, phantom);
            }
        });

        // Defining the base line.
        var baseLineWidth = 0;
        $('span.lines', phantom).each(function () {
            if ($(this).width() > baseLineWidth) {
                baseLineWidth = $(this).width();
                $(this).addClass('base-line').siblings('span.lines').removeClass('base-line');
            }
        });

        while (Number(phantom.css('height').replace('px', '')) > height) {
            fontSize = (Number(fontSize.replace('px', '')) - 0.5) + 'px';

            phantom.css({
                'font-size': fontSize
            });
        }

        while (Number($('.base-line', phantom).css('width').replace('px', '')) > phantom.width()) {
            fontSize = (Number(fontSize.replace('px', '')) - 0.5) + 'px';

            phantom.css({
                'font-size': fontSize
            });
        }

        phantom.css({
            'display': 'table-cell',
            'vertical-align': 'middle',
            'height': this.initHeight + 'px'
        });

        return { $el: phantom, fontSize: fontSize };
    };

    /*
     * .addClassSVG(className)
     * Adds the specified class(es) to each of the set of matched SVG elements.
     */
    $.fn.addClassSVG = function (className) {
        $(this).attr('class', function (index, existingClassNames) {
            var re = new RegExp(className, 'g');
            if (existingClassNames.match(re) == null) {
                return existingClassNames + ' ' + className;
            } else {
                return existingClassNames;
            }
        });
        return this;
    };

    /*
     * .removeClassSVG(className)
     * Removes the specified class to each of the set of matched SVG elements.
     */
    $.fn.removeClassSVG = function (className) {
        $(this).attr('class', function (index, existingClassNames) {
            var names = className.split(' ');
            var re;
            var result = existingClassNames;
            for (var i = 0; i < className.split(' ').length; i++) {
                re = new RegExp(names[i], 'g');
                result = result.replace(re, '');
            }
            return result.trim();
        });
        return this;
    };

    $.fn.swapToBottom = function () {
        this.parent().prepend(this.siblings());
        return this;
    };

    /************************************************************************************
     MODELS
     *************************************************************************************/
    //使用Backbone.js套件，創建ImageEditor, Layer, ImageLayer, TextLayer, ImageTextLayer 5種Models
    ImageEditor.Models.ImageEditor = Backbone.Model.extend({
        defaults: {
            screenWidth: 500,
            screenHeight: 500,
            draggingOutside: true,
            background: false
        }
    });

    var layerLastId = 0;

    ImageEditor.Models.Layer = Backbone.Model.extend({
        defaults: {
            id: 0,  //图层的唯一标识符，默认为 0
            x: 'center',   //图层的位置，默认为 'center'，即居中
            y: 'center',
            width: 0,
            height: 0,
            halfWidth: 0,  //宽度和高度的一半???
            halfHeight: 0,
            rotation: 0,  //旋转角度和缩放比例，默认为 0 和 1
            scale: 1,
            active: false,

            flipVertical: false,  //垂直和水平翻转状态，默认为 false
            flipHorizontal: false,

            strokeSize: 4,
            rotationHandleXOffset: -10, //旋转手柄的偏移量
            rotationHandleYOffset: -30,
            minDimension: 20,  //最小尺寸限制，默认为 20。
            handleSize: 15,  //处理大小，默认为 15
            halfHandleSize: 0  //处理大小的一半
        },
        initialize: function () {
            this.on("change:width change:height", this.calculatedValues, this);
            this.calculatedValues();

            if (this.get("type") == "text") {
                var size = ImageEditor.Helpers.getSize(
                    this.get("text"), this.get("textFontSize"), this.get("textFont")
                );
                if (this.get("width") == 0 && this.get("height") == 0) {
                    this.set("width", size.width);
                    this.set("height", size.height);
                }
                this.set("textWidth", size.width);
                this.set("textHeight", size.height);
            }

            // Set layer unique ID
            this.set('id', layerLastId);
            layerLastId += 1;
        },
        // 销毁方法，在模型销毁时调用
        destroy: function () {
            this.off("change:width change:height", this.calculatedValues);
        },
        // 验证方法，用于验证属性是否合法
        validate: function (attrs) {
            if (attrs.width < this.minDimension || attrs.height < this.minDimension) {
                return "Dimension is to small";
            }
        },
        // 计算半宽度和半高度的方法  
        // 獲取模型的寬度this.get("width"), 除以2, 命名為"halfWidth"
        //this.get("handleSize"): 獲取當前模型的句柄大小
        calculatedValues: function () {
            this.set("halfWidth", this.get("width") / 2);
            this.set("halfHeight", this.get("height") / 2);
            this.set("halfHandleSize", this.get("handleSize") / 2);
        }
    });

    //extend為backbone處理方法
    //創建一個Models
    //ImageEditor.Models.ImageLayer 是 ImageEditor.Models.Layer 的扩展模型，继承了 Layer 模型的所有属性和方法，并添加了特定于图像图层的属性。
    //增加image所要增加的屬性
    ImageEditor.Models.ImageLayer = ImageEditor.Models.Layer.extend({
        defaults: _.extend({}, ImageEditor.Models.Layer.prototype.defaults, {
            type: "image",
            imgType: "image",
            src: ""
        })
    });

    //增加text所要增加的屬性
    ImageEditor.Models.TextLayer = ImageEditor.Models.Layer.extend({
        defaults: _.extend({}, ImageEditor.Models.Layer.prototype.defaults, {
            type: "text",
            text: "",
            textWidth: 0,
            textHeight: 0,
            textFont: "Arial",
            textFontSize: 16,
            textColor: "#000000"
        })
    });

    //增加imageText所要增加的屬性
    ImageEditor.Models.ImageTextLayer = ImageEditor.Models.Layer.extend({
        defaults: _.extend({}, ImageEditor.Models.Layer.prototype.defaults, {
            type: "imageText",
            imgType: "image",
            src: "",
            text: "",
            textWidth: 0,
            textHeight: 0,
            textFont: "Arial",
            textFontSize: 16,
            lineHeight: 1.2,
            textColor: "#000000",
            svgColor: '#ffffff',
            extraClass: '',
            textAlign: 'center',
            layerId: false
        })
    });

    /************************************************************************************
     COLLECTIONS
     *************************************************************************************/
    // 使用Backbone.js中的Backbone.Collection
    // Backbone.Collection 是 Backbone.js 框架中的一个重要组件，它用于管理和操作一组相关的模型（Backbone.Model 实例）

    //通过这个集合，可以对多个 Layer 模型进行统一的管理和操作
    ImageEditor.Collections.Layers = Backbone.Collection.extend({
        initialize: function () {
            //SET ACTIVE LAYER
            //当集合中任何一个模型的 active 属性发生变化时，会调用 changeActiveLayerStatus 方法。
            //點擊那個圖層時，會跳到第一個給我們編輯
            this.on("change:active", this.changeActiveLayerStatus, this);
        },

        changeActiveLayerStatus: function (model, options) {
            if (options == true) {
                this.forEach(function (mod, index) {
                    if (model != mod) {
                        mod.set('active', false);
                    }
                });
            }
        }
    });

    /************************************************************************************
     VIEWS
     *************************************************************************************/
    //Backbone.View 是 Backbone.js 框架中的一个关键组件，主要用于管理用户界面的呈现和交互。

    ImageEditor.Views.Init = ImageEditor.SvgBackboneView.extend({
        tagName: "svg", //<svg> 标签

        events: {
            'click': 'removeActiveStatuses'
        },

        initialize: function (options) {
            this.model = new ImageEditor.Models.ImageEditor();

            this.model.on('change:screenWidth change:screenHeight', this.resizeScreen, this);
            this.model.on('change:background', this.changeBackground, this);

            this.model.set('screenWidth', options.screenWidth);
            this.model.set('screenHeight', options.screenHeight);
            this.model.set('background', options.background);
            this.screenOffsetLeft = options.screenOffsetLeft;
            this.screenOffsetTop = options.screenOffsetTop;

            this.collection.on("add", this.renderLayer, this);

            _.bindAll(this, 'bindKeyboardEvents');
            $(document).bind('keydown', this.bindKeyboardEvents);

            this.render();
            this.changeBackground();
        },

        render: function () {
            this.collection.each(this.renderLayer, this);
            return this;
        },

        changeBackground: function () {
            if (this.model.get('background')) {
                $('#imageEditorBackground').removeAttr('class').addClass('background ' + this.model.get('background'));
            }
        },

        resizeScreen: function () {
            this.$el.attr("width", this.model.get("screenWidth"));
            this.$el.attr("height", this.model.get("screenHeight"));
        },

        clearScreen: function () {
            this.collection.remove(this.collection.models);
            this.model.set('background', ' ');
        },

        renderLayer: function (model) {
            var newLayer = new ImageEditor.Views.Layer({
                model: model,
                screenWidth: this.model.get("screenWidth"),
                screenHeight: this.model.get("screenHeight"),
                draggingOutside: this.model.get("draggingOutside")
            });

            this.$el.append(newLayer.el);
        },

        deleteLayer: function (id) {
            var targetLayer = this.collection.find(function (model) {
                return model.get("id") == id;
            });

            this.collection.remove(targetLayer);
        },

        addLayer: function (options) {
            var newLayer = false;

            if (options.type == 'text') {
                newLayer = new ImageEditor.Models.TextLayer(options);
            } else if (options.type == 'image') {
                newLayer = new ImageEditor.Models.ImageLayer(options);
            } else if (options.type == 'imageText') {
                newLayer = new ImageEditor.Models.ImageTextLayer(options);
            }

            if (newLayer) this.collection.add(newLayer);
            else console.log('layer type is undefined');
        },

        removeActiveStatuses: function (e) {
            if ($(e.target).closest(".layer").length) return;
            this.collection.find(function (model) {
                if (model.get('active') == true) {
                    model.set('active', false);
                }
            });
        },

        //方向鍵來操控元件位置
        bindKeyboardEvents: function (e) {
            if ($(e.target).prop("tagName") == 'TEXTAREA') return;

            var layer = this.collection.find(function (model) {
                if (model.get('active') == true) return model;
            });

            if (typeof layer == 'undefined') return;

            // left
            if (e.keyCode == 37) {
                e.preventDefault();
                layer.set('x', layer.get('x') - 2);
            }
            // right
            else if (e.keyCode == 39) {
                e.preventDefault();
                layer.set('x', layer.get('x') + 2);
            }
            // up
            else if (e.keyCode == 38) {
                e.preventDefault();
                layer.set('y', layer.get('y') - 2);
            }
            // down
            else if (e.keyCode == 40) {
                e.preventDefault();
                layer.set('y', layer.get('y') + 2);
            }
            // delete
            else if (e.keyCode == 46) {
                e.preventDefault();
                this.collection.remove(layer);
            }
            // backspace
            else if (e.keyCode == 8) {
                e.preventDefault();
                this.collection.remove(layer);
            }
        }
    });

    ImageEditor.Views.Layer = ImageEditor.SvgBackboneView.extend({
        templates: {
            layer: ImageEditor.Helpers.templateHelper("constructorLayer"),
            transform: _.template("translate(<%=x%>,<%=y%>) scale(<%=scale%>) rotate(<%=rotation%>)")
        },
        tagName: "g",
        className: "layer",

        initialize: function (options) {
            this.screenWidth = options.screenWidth;
            this.screenHeight = options.screenHeight;
            this.draggingOutside = options.draggingOutside;
            this.initWidth = this.model.get('width');
            this.initHeight = this.model.get('height');

            //将指定的方法绑定到当前视图的上下文中，以确保 this 始终指向视图实例。
            _.bindAll(this, "rotatableStart", "resizableStart", "draggableStart", "onMoveEvent", "onEndEvent", "onAnimationFrame", "onSizeChange", "e_resizableStart", "w_resizableStart", "n_resizableStart", "s_resizableStart");
            //add a new function e_resizableStart

            this.documentEl = $(window.document);

            //管理所有拖拉動作
            this.model.on("change:x change:y change:rotation change:width change:height", this.onTransformChange, this);
            this.model.on("change:width change:height", this.onSizeChange, this);
            this.model.on("destroy remove", this.remove, this);
            this.model.on("change:active", this.setActiveClass, this);
            this.model.on("change:flipHorizontal", this.flipImage, this);
            this.model.on("change:flipVertical", this.flipImage, this);


            //如果图层的 x 和 y 属性为 'center'，则将其设置为画布的中心位置
            if (this.model.get('x') == 'center' && this.model.get('y') == 'center') {
                this.model.set({
                    //滑鼠拖拉，svg可以跟著移動
                    'x': this.screenWidth / 2,
                    'y': this.screenHeight / 2
                });
            }

            //Image圖層
            if (this.model.get("type") == "image") {
                this.model.on("change:src", this.onImageSrcChange, this);
                this.model.on("change:width change:height change:src", this.onImageChange, this);
                //Text圖層
            } else if (this.model.get("type") == "text") {
                this.model.on("change:width change:height", this.onTextSizeChange, this);
                this.model.on("change:textFont change:textFontSize change:textColor", this.onTextStyleChange, this);
                //ImageText
            } else if (this.model.get("type") == "imageText") {
                this.model.on("change:width change:height change:src", this.onImageChange, this);
                this.model.on("change:width change:height", this.onImageTextSizeChange, this);

                if (detectIE()) {
                    this.model.on("change:textFont change:textFontSize change:textColor change:textAlign change:flipVertical change:flipHorizontal", this.onImageTextChange, this);
                } else {
                    this.model.on("change:textFont change:textFontSize change:textColor change:textAlign change:flipVertical change:flipHorizontal", this.onImageTextStyleChange, this);
                }

                this.model.on("change:lineHeight", this.onLineHeightChange, this);

                this.model.on("change:svgColor", this.onSvgColorChange, this);
                this.model.on("change:text", this.onImageTextChange, this);
            }

            this.$el.attr("data-layer-id", this.model.get("id"));
            this.$el.attr("data-orientation", 'n');

            this.render();
        },

        //刪除無影響
        moveTo: function (x, y) {
            this.model.set({ "x": x, "y": y });
        },

        //刪除無影響
        resize: function (width, height) {
            this.model.set({ "width": width, "height": height });
        },

        //水平&垂直翻轉
        flipImage: function () {
            //首先检查图层的类型是否为 svg
            if (this.model.get('imgType') == 'svg') {
                $('.image g', this.$el).attr('transform', '');
                this.$el.find("foreignObject.image-editor-text").removeClassSVG('horizontal vertical');

                if (this.model.get('flipHorizontal') && !this.model.get('flipVertical')) {
                    this.$el.find("foreignObject.image-editor-text").addClassSVG('horizontal');
                    $('.image g', this.$el).attr('transform', 'scale(-1 1) ' + $('.image g', this.$el).attr('data-translate-x'));
                } else if (!this.model.get('flipHorizontal') && this.model.get('flipVertical')) {
                    this.$el.find("foreignObject.image-editor-text").addClassSVG('vertical');
                    $('.image g', this.$el).attr('transform', 'scale(1 -1) ' + $('.image g', this.$el).attr('data-translate-y'));
                } else if (this.model.get('flipHorizontal') && this.model.get('flipVertical')) {
                    this.$el.find("foreignObject.image-editor-text").addClassSVG('horizontal vertical');
                    $('.image g', this.$el).attr('transform', 'scale(-1 -1) ' + $('.image g', this.$el).attr('data-translate-xy'));
                }
                //如果不是 svg
            } else {
                $('image', this.$el).attr('transform', '');
                this.$el.removeClassSVG('vertical horizontal');

                if (this.model.get('flipHorizontal') && !this.model.get('flipVertical')) {
                    this.$el.addClassSVG('horizontal');
                    $('image', this.$el).attr('transform', 'scale(-1, 1) ');
                } else if (!this.model.get('flipHorizontal') && this.model.get('flipVertical')) {
                    this.$el.addClassSVG('vertical');
                    $('image', this.$el).attr('transform', 'scale(1, -1) ');
                } else if (this.model.get('flipHorizontal') && this.model.get('flipVertical')) {
                    this.$el.addClassSVG('horizontal vertical');
                    $('image', this.$el).attr('transform', 'scale(-1, -1) ');
                }
            }
        },

        //处理图层变换、文本大小变化即調整图像文本大小变化的功能
        //onTransformChange刪除，什麼圖片大小無法縮放，也動不了
        onTransformChange: function () {
            this.$el.attr("transform", this.templates.transform(this.model.attributes));
        },

        onTextSizeChange: function () {
            var text = this.$el.find("text");

            var w = Math.min(this.model.get("width") / this.model.get("textWidth"));
            var h = Math.min(this.model.get("height") / this.model.get("textHeight"));
            var scale = (w || h);

            text.attr({
                "fill": this.model.get("textColor"),
                "transform": "scale(" + scale + ")"
            });
        },

        onImageTextSizeChange: function () {
            //如果是IE瀏覽器
            if (detectIE()) {
                var text = this.$el.find(".ie-image-editor-text-container");

                text.attr({
                    "fill": this.model.get("textColor")
                });
            } else {
                var text = this.$el.find("foreignObject");

                var w = Math.min(this.model.get("width") / text.attr('width'));
                var h = Math.min(this.model.get("height") / text.attr('height'));
                var scale = (w || h);

                text.attr({
                    "fill": this.model.get("textColor"),
                    "transform": "scale(" + scale + ")"
                });
            }
        },

        renderText: function ($el) {
            var result = $();
            //对每个 span.letter 元素
            $el.find('span.letter').each(function () {
                //创建一个新的 SVG text 元素
                var node = ImageEditor.Helpers.createSvgElement('text');
                //将 span.letter 元素的文本内容赋给 text 元素
                node.textContent = $(this).text();
                //设置 text 元素的位置（x 和 y 属性）
                node.setAttributeNS(null, 'x', $(this).position().left);
                node.setAttributeNS(null, 'y', $(this).position().top + ($(this).height() * 80 / 100));

                result.push.apply(result, $(node));
            });

            return result;
        },

        //在图像文本内容发生变化时，根据浏览器类型更新文本内容
        onImageTextChange: function () {
            var params = this.onImageTextStyleChange();

            //如果是 IE 浏览器，调用 renderText 方法并更新
            if (detectIE()) {
                this.$el.find('.ie-image-editor-text-container').html(this.renderText(params.$el));
            } else {
                this.$el.find('.image-editor-text-container').html(this.model.get('text'));
            }
        },

        //在文本样式（字体、字体大小、颜色）发生变化时更新 SVG 元素的样式
        onTextStyleChange: function () {
            this.$el.find("text, foreignObject.image-editor-text").css({
                'font-family': this.model.get('textFont'),
                'font-size': this.model.get('textFontSize'),
                'color': this.model.get('textColor')
            });
        },

        //在 SVG 颜色发生变化时更新 SVG 路径的填充颜色
        onSvgColorChange: function () {
            this.$el.find('svg.image path').css({
                fill: this.model.get('svgColor')
            });
        },

        onImageTextStyleChange: function () {
            var extra = '';

            //检查文本是否垂直或水平翻转，并更新 extra 字符串。
            if (this.model.get('flipVertical')) {
                extra += ' vertical';
            }

            if (this.model.get('flipHorizontal')) {
                extra += ' horizontal';
            }

            //使用 ImageEditor.Helpers.getSize2 计算文本样式参数，传入模型的各种属性
            var params = ImageEditor.Helpers.getSize2(
                this.model.get('text'),
                this.model.get('textFontSize'),
                this.model.get('textFont'),
                this.initWidth,
                this.initHeight,
                this.model.get('lineHeight'),
                this.model.get('extraClass') + extra,
                this.model.get('textAlign')
            );

            //更新 .ie-image-editor-text-container 和 foreignObject.image-editor-text 元素的样式，包括字体、字号、行高、颜色和文本对齐方式
            this.$el.find(".ie-image-editor-text-container, foreignObject.image-editor-text").css({
                'font-family': this.model.get('textFont'),
                'font-size': params.fontSize,
                'line-height': this.model.get('lineHeight'),
                'color': this.model.get('textColor'),
                'text-align': this.model.get('textAlign')
            });

            //将 .ie-image-editor-text-container 元素的 fill 属性设置为模型中的文本颜色
            this.$el.find('.ie-image-editor-text-container').attr('fill', this.model.get('textColor'));

            return params;
        },

        onLineHeightChange: function () {

        },

        //在图像属性变化时更新图像元素的位置和大小
        onImageChange: function () {
            this.$el.find("image, .image, .ie-image-editor-text-container").attr({
                "x": -this.model.get("halfWidth"), "y": -this.model.get("halfHeight"),
                "height": this.model.get("height"), "width": this.model.get("width")
            });
        },

        //在图像源变化时更新 image 元素的 src 属性
        onImageSrcChange: function () {
            this.$el.find("image").attr({
                "href": this.model.get("src")
            });
        },

        //当模型的尺寸变化时，更新各个可拖动、可调整大小、可旋转和其他控制手柄的位置和尺寸
        onSizeChange: function () {
            this.draggableHandle.attr({
                //更新 draggableHandle 的 x、y、width 和 height 属性，使其与模型的宽度和高度保持一致(等比例應該是這裡在控制的)
                "x": -this.model.get("halfWidth"),
                "y": -this.model.get("halfHeight"),
                "width": this.model.get("width"),
                "height": this.model.get("height")
            });

            this.ulResizableHandle.attr({
                transform: "translate(" + (-this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + (-this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });

            this.urResizableHandle.attr({
                transform: "translate(" + (this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + (-this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });

            this.llResizableHandle.attr({
                transform: "translate(" + (-this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + (this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });

            this.lrResizableHandle.attr({
                transform: "translate(" + (this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + (this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });

            // add
            //translate decides the direction to drag
            this.eResizableHandle.attr({
                //移動到物件中間
                //尺規位置，與縮放效果無關
                //this.model.get("halfHandleSize") 指物件的一半高度
                transform: "translate(" + (this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + 0 + ")"
            });

            this.wResizableHandle.attr({
                transform: "translate(" + (-this.model.get("halfWidth") - this.model.get("halfHandleSize")) + ", " + (this.model.get("halfHandleSize")) + ")"
            });

            this.nResizableHandle.attr({
                transform: "translate(" + (- this.model.get("halfHandleSize")) + ", " + (-this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });

            this.sResizableHandle.attr({
                transform: "translate(" + (- this.model.get("halfHandleSize")) + ", " + (this.model.get("halfHeight") - this.model.get("halfHandleSize")) + ")"
            });
            //add-end

            //更新 rotatableGroup、flipGroup 和 removeGroup 的 transform 属性，调整它们的位置以匹配新的尺寸
            this.rotatableGroup.attr({
                transform: "translate(0, " + -this.model.get("halfHeight") + ")"
            });

            this.flipGroup.attr({
                transform: "translate(" + this.model.get("halfWidth") + ", " + (-this.model.get("halfHeight") + 20) + ")",
            });

            this.removeGroup.attr({
                transform: "translate(" + this.model.get("halfWidth") + ", " + (-this.model.get("halfHeight") - 30) + ")",
            });
        },

        //rotate可刪除
        calculateScreenCenterPoint: function () {
            var rotation = this.model.get("rotation");
            this.model.set("rotation", 0);

            //物件中心點XY
            var centerX = (this.rotatableHandle.offset().left + this.model.get("halfHandleSize"));
            var centerY = (this.rotatableHandle.offset().top + this.model.get("halfHandleSize") +
                Math.abs(this.model.get("rotationHandleYOffset")) + this.model.get("halfHeight"));

            this.model.set({
                "pageRectCenterX": centerX,
                "pageRectCenterY": centerY,
                "rotation": rotation
            });
        },

        //开始调整大小操作时的初始化
        rotatableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.rotatableHandlerDrag = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },

        resizableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.resizableHandlerDrag = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },

        //add
        //往水平拉，不等比例
        e_resizableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.resizableHandlerDrag_e = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },
        w_resizableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.resizableHandlerDrag_w = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },
        n_resizableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.resizableHandlerDrag_n = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },
        s_resizableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.resizableHandlerDrag_s = true;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },
        //add-end


        //开始拖动操作时的初始化
        draggableStart: function (e) {
            e.preventDefault();

            this.calculateScreenCenterPoint();
            this.draggableHandlerDrag = true;

            this.startPosX = this.model.get("x");
            this.startPosY = this.model.get("y");
            this.startMouseX = e.pageX;
            this.startMouseY = e.pageY;

            this.documentEl.bind("mousemove", this.onMoveEvent);
            this.documentEl.bind("mouseup", this.onEndEvent);
        },

        //在鼠标移动事件时处理旋转、调整大小和拖动操作
        onMoveEvent: function (e) {
            this.pendingWidth = this.model.get("width");
            this.pendingHeight = this.model.get("height");
            this.pendingRotation = this.model.get("rotation");
            this.pendingX = this.model.get("x");
            this.pendingY = this.model.get("y");

            //current mouse position
            var pageX = e.pageX;
            var pageY = e.pageY;

            if (this.rotatableHandlerDrag) {
                this.calculateRectangleRotation(pageX, pageY);
            }
            else if (this.resizableHandlerDrag) {

                this.calculateRectangleSize(pageX, pageY);
            }
            else if (this.draggableHandlerDrag) {
                this.calculateRectanglePosition(pageX, pageY);
            } //add
            else if (this.resizableHandlerDrag_e) {
                this.calculateRectangleSize_e(pageX, pageY);
            }
            else if (this.resizableHandlerDrag_w) {
                this.calculateRectangleSize_w(pageX, pageY);
            } else if (this.resizableHandlerDrag_n) {
                this.calculateRectangleSize_n(pageX, pageY);
            } else if (this.resizableHandlerDrag_s) {
                this.calculateRectangleSize_s(pageX, pageY);
            }

            //add end
            window.requestAnimationFrame(this.onAnimationFrame);
        },



        //计算矩形的旋转角度 不可刪除
        //滑鼠游標的XY軸 pageX pageY
        calculateRectangleRotation: function (pageX, pageY) {
            //滑鼠游標指到的X座標，與原本物件中心點X座標 差別
            this.xDelta = pageX - this.model.get("pageRectCenterX");
            this.yDelta = this.model.get("pageRectCenterY") - pageY; //往上拉數據為正數，反之則是負數
            this.pendingRotation = 450 - ImageEditor.Helpers.degrees(Math.atan(this.yDelta / this.xDelta));

            var quadrantNumber = ImageEditor.Helpers.getQuadrantNumber(this.xDelta, this.yDelta);
            var angle = this.pendingRotation - 360;
            if (quadrantNumber == 2 || quadrantNumber == 3) {
                angle = angle + 180;
            }
            this.setOrientation(angle);

            switch (ImageEditor.Helpers.getQuadrantNumber(this.xDelta, this.yDelta)) {
                case 2:
                case 3:
                    this.pendingRotation += 180;
                    break;
                case 4:
                    this.pendingRotation += 360;
                    break;
            }

        },


        //這部分應該也是旋轉
        setOrientation: function (angle) {
            var axisArray = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
            var octant = Math.round(angle / 45); // 0 .. 7
            this.$el.attr("data-orientation", axisArray[octant]);
        },

        //有關“等比例”縮放的部分
        calculateRectangleSize: function (pageX, pageY) {

            //count the position after rotate
            this.rotatedPoint = ImageEditor.Helpers.rotatePointAroundOrigin(
                this.model.get("pageRectCenterX"),
                this.model.get("pageRectCenterY"),
                pageX, pageY,
                ImageEditor.Helpers.radians(-this.model.get("rotation"))
            );

            //計算x和y方向的距離變化
            //这行代码计算了矩形中心点 pageRectCenterX 和旋转点 rotatedPoint.x 之间的绝对距离，这个距离就是 xDelta。
            this.xDelta = Math.abs(this.model.get("pageRectCenterX") - this.rotatedPoint.x);
            this.yDelta = Math.abs(this.model.get("pageRectCenterY") - this.rotatedPoint.y);

            //確保距離不小於句柄大小
            if (this.xDelta < this.model.get("handleSize")) {
                this.xDelta = this.model.get("handleSize");
            }

            if (this.yDelta < this.model.get("handleSize")) {
                this.yDelta = this.model.get("handleSize");
            }

            //計算寬度和高度的變化
            this.pendingWidth = this.xDelta * 2;
            this.pendingHeight = this.yDelta * 2;

            //計算寬度和高度的比例變化
            this.scaleWidthDelta = this.pendingWidth / this.model.get("width");
            this.scaleHeightDelta = this.pendingHeight / this.model.get("height");

            //確保長寬比不變 跟Bruce寫的widget有異曲同工之妙
            if (this.scaleWidthDelta < this.scaleHeightDelta) {
                this.pendingHeight = this.model.get("height") * this.scaleWidthDelta;
            } else {
                this.pendingWidth = this.model.get("width") * this.scaleHeightDelta;
            }
            console.log('往右拉有執行嗎?1');
        },



        //不等比例拉長
        //eastern
        calculateRectangleSize_e: function (pageX, pageY) {

            //count the position after rotate
            this.rotatedPoint = ImageEditor.Helpers.rotatePointAroundOrigin(
                this.model.get("pageRectCenterX"),
                this.model.get("pageRectCenterY"),
                pageX, pageY,
                ImageEditor.Helpers.radians(-this.model.get("rotation"))

            );

            //計算x和y方向的距離變化
            //这行代码计算了矩形中心点 pageRectCenterX 和旋转点 rotatedPoint.x 之间的绝对距离，这个距离就是 xDelta。
            this.xDelta = Math.abs(this.model.get("pageRectCenterX") - this.rotatedPoint.x);
            this.yDelta = Math.abs(this.model.get("pageRectCenterY") - this.rotatedPoint.y);


            //確保距離不小於句柄大小
            if (this.xDelta < this.model.get("handleSize")) {
                this.xDelta = this.model.get("handleSize");

            }
            if (this.yDelta < this.model.get("handleSize")) {
                this.yDelta = this.model.get("handleSize");
            }

            //計算寬度和高度的變化
            //只留下可以拉寬度，高度刪除
            this.pendingWidth = this.xDelta * 2;
            //this.pendingHeight = this.yDelta * 2;

            console.log("e");
        },
        //western
        calculateRectangleSize_w: function (pageX, pageY) {

            //count the position after rotate
            this.rotatedPoint = ImageEditor.Helpers.rotatePointAroundOrigin(
                this.model.get("pageRectCenterX"),
                this.model.get("pageRectCenterY"),
                pageX, pageY,
                ImageEditor.Helpers.radians(-this.model.get("rotation"))

            );

            //計算x和y方向的距離變化
            //这行代码计算了矩形中心点 pageRectCenterX 和旋转点 rotatedPoint.x 之间的绝对距离，这个距离就是 xDelta。
            this.xDelta = Math.abs(this.model.get("pageRectCenterX") - this.rotatedPoint.x);
            this.yDelta = Math.abs(this.model.get("pageRectCenterY") - this.rotatedPoint.y);


            //確保距離不小於句柄大小
            if (this.xDelta < this.model.get("handleSize")) {
                this.xDelta = this.model.get("handleSize");

            }
            if (this.yDelta < this.model.get("handleSize")) {
                this.yDelta = this.model.get("handleSize");
            }

            //計算寬度和高度的變化
            //只留下可以拉寬度，高度刪除
            this.pendingWidth = this.xDelta * 2;
            //this.pendingHeight = this.yDelta * 2;

            console.log("w");
        },

        //northern
        calculateRectangleSize_n: function (pageX, pageY) {

            //count the position after rotate
            this.rotatedPoint = ImageEditor.Helpers.rotatePointAroundOrigin(
                this.model.get("pageRectCenterX"),
                this.model.get("pageRectCenterY"),
                pageX, pageY,
                ImageEditor.Helpers.radians(-this.model.get("rotation"))

            );

            //計算x和y方向的距離變化
            //这行代码计算了矩形中心点 pageRectCenterX 和旋转点 rotatedPoint.x 之间的绝对距离，这个距离就是 xDelta。
            this.xDelta = Math.abs(this.model.get("pageRectCenterX") - this.rotatedPoint.x);
            this.yDelta = Math.abs(this.model.get("pageRectCenterY") - this.rotatedPoint.y);


            //確保距離不小於句柄大小
            if (this.xDelta < this.model.get("handleSize")) {
                this.xDelta = this.model.get("handleSize");

            }
            if (this.yDelta < this.model.get("handleSize")) {
                this.yDelta = this.model.get("handleSize");
            }

            //計算寬度和高度的變化
            //只留下可以拉高度，寬度刪除
            //this.pendingWidth = this.xDelta * 2;
            this.pendingHeight = this.yDelta * 2;
            console.log("n");
            console.log(this.pendingHeight);
        },

        //southern
        calculateRectangleSize_s: function (pageX, pageY) {

            //count the position after rotate
            this.rotatedPoint = ImageEditor.Helpers.rotatePointAroundOrigin(
                this.model.get("pageRectCenterX"),
                this.model.get("pageRectCenterY"),
                pageX, pageY,
                ImageEditor.Helpers.radians(-this.model.get("rotation"))

            );

            //計算x和y方向的距離變化
            //这行代码计算了矩形中心点 pageRectCenterX 和旋转点 rotatedPoint.x 之间的绝对距离，这个距离就是 xDelta。
            this.xDelta = Math.abs(this.model.get("pageRectCenterX") - this.rotatedPoint.x);
            this.yDelta = Math.abs(this.model.get("pageRectCenterY") - this.rotatedPoint.y);


            //確保距離不小於句柄大小
            if (this.xDelta < this.model.get("handleSize")) {
                this.xDelta = this.model.get("handleSize");

            }
            if (this.yDelta < this.model.get("handleSize")) {
                this.yDelta = this.model.get("handleSize");
            }

            //計算寬度和高度的變化333398--------------------------------9
            //只留下可以拉高度，寬度刪除
            //this.pendingWidth = this.xDelta * 2;
            this.pendingHeight = this.yDelta * 2;
            console.log("s");
            console.log(this.pendingHeight);
        },

        //add end

        calculateRectanglePosition: function (pageX, pageY) {
            this.pendingX = this.startPosX + (pageX - this.startMouseX);
            this.pendingY = this.startPosY + (pageY - this.startMouseY);

            var clientSize = this.draggableHandle[0].getBoundingClientRect();

            if (!this.draggingOutside) {
                if (this.pendingX - clientSize.width / 2 < 0) this.pendingX = clientSize.width / 2;
                if (this.pendingY - clientSize.height / 2 < 0) this.pendingY = clientSize.height / 2;

                if (this.pendingX - clientSize.width / 2 + clientSize.width > this.screenWidth)
                    this.pendingX = this.screenWidth - clientSize.width + clientSize.width / 2;

                if (this.pendingY - clientSize.height / 2 + clientSize.height > this.screenHeight)
                    this.pendingY = this.screenHeight - clientSize.height + clientSize.height / 2;
            }
        },

        onEndEvent: function (e) {
            e.preventDefault();
            this.rotatableHandlerDrag = false;
            this.resizableHandlerDrag = false;
            this.draggableHandlerDrag = false;
            //add
            this.resizableHandlerDrag_e = false;
            this.resizableHandlerDrag_w = false;
            this.resizableHandlerDrag_n = false;
            this.resizableHandlerDrag_s = false;
            //add end
            //解除 mousemove 和 mouseup 事件绑定。
            this.documentEl.unbind("mousemove", this.onMoveEvent);
            this.documentEl.unbind("mouseup", this.onEndEvent);
        },

        //更新模型的属性并请求下一帧动画 看不太懂???
        onAnimationFrame: function () {
            this.model.set({
                x: this.pendingX,
                y: this.pendingY,
                width: this.pendingWidth,
                height: this.pendingHeight,
                rotation: this.pendingRotation
            });

            if (this.resizableHandlerDrag || this.rotatableHandlerDrag || this.draggableHandlerDrag || this.resizableHandlerDrag_e || this.resizableHandlerDrag_w || this.resizableHandlerDrag_n || this.resizableHandlerDrag_s) {
                window.requestAnimationFrame(this.onAnimationFrame);
            }
        },

        //创建并添加图像层
        createImageLayer: function () {
            var image = ImageEditor.Helpers.createSvgElement("image");
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.model.get("src"));
            image.setAttributeNS(null, "preserveAspectRatio", "none");

            this.$el.prepend(image);

            this.onImageChange();
            this.setActiveStatus();
        },

        //创建并添加文本层
        createTextLayer: function () {
            var text = ImageEditor.Helpers.createSvgElement('text');
            text.textContent = this.model.get('text');

            text.setAttributeNS(null, 'text-anchor', 'middle');
            text.setAttributeNS(null, 'dominant-baseline', 'central');

            this.$el.prepend(text);

            this.onTextStyleChange();
            this.onTextSizeChange();
            this.setActiveStatus();
        },

        //创建并添加图像文本层
        createImageTextLayer: function () {
            var them = this;

            //如果图像类型是 svg
            if (this.model.get('imgType') == 'svg') {
                jQuery.get(this.model.get("src"), function (data) {
                    var $svg = jQuery(data).find('svg');
                    $svg[0].setAttributeNS(null, "class", "image");
                    them.$el.prepend($svg);

                    them.onImageChange();
                    them.onSvgColorChange();
                }, 'xml');
                //如果图像类型不是 svg，创建 image 元素并设置其 href 和 preserveAspectRatio 属性，然后添加到 this.$el 中
            } else {
                var image = ImageEditor.Helpers.createSvgElement("image");
                image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.model.get("src"));
                image.setAttributeNS(null, "preserveAspectRatio", "none");

                this.$el.prepend(image);
            }

            this.onImageChange();

            //如果检测到 IE 浏览器 ????
            if (detectIE()) {
                var text = ImageEditor.Helpers.createSvgElement('svg');

                text.setAttributeNS(null, "class", "ie-image-editor-text-container");

                text.setAttributeNS(null, "viewBox", '0 0 ' + this.model.get("width") + ' ' + this.model.get("height"));
                text.setAttributeNS(null, "preserveAspectRatio", 'xMinYMin slice');
                text.setAttributeNS(null, "height", this.model.get("height"));
                text.setAttributeNS(null, "width", this.model.get("width"));
                text.setAttributeNS(null, "x", '-' + this.model.get("halfWidth"));
                text.setAttributeNS(null, "y", '-' + this.model.get("halfHeight"));

                this.$el.prepend(text);

                this.onImageTextChange();
                this.onImageTextStyleChange();
                this.onImageTextSizeChange();
            } else {
                var text = ImageEditor.Helpers.createSvgElement('foreignObject');
                text.setAttributeNS(null, "class", "image-editor-text " + this.model.get('extraClass'));
                text.setAttributeNS(null, "height", this.model.get("height"));
                text.setAttributeNS(null, "width", this.model.get("width"));
                text.setAttributeNS(null, "x", '-' + this.model.get("halfWidth"));
                text.setAttributeNS(null, "y", '-' + this.model.get("halfHeight"));
                $(text).html('<div class="image-editor-text-container" style="width: ' + this.model.get("width") + 'px; height: ' + this.model.get("height") + 'px">' + this.model.get('text') + '</div>');

                $('.draggable-handle', this.$el).before(text);

                this.onImageTextStyleChange();
                this.onImageTextSizeChange();
            }

            //最后调用 setActiveStatus 设置活动状态
            this.setActiveStatus();
        },

        //垂直翻转图像
        flipImageVerticalEvent: function () {
            if (this.model.get('flipVertical')) {
                this.model.set('flipVertical', false);
            } else {
                this.model.set('flipVertical', true);
            }
        },

        //水平翻转图像
        flipImageHorizontalEvent: function () {
            if (this.model.get('flipHorizontal')) {
                this.model.set('flipHorizontal', false);
            } else {
                this.model.set('flipHorizontal', true);
            }
        },


        //设置图像的活动类
        setActiveClass: function () {
            if (this.model.get("active"))
                this.$el.addClassSVG("active");
            else
                this.$el.removeClassSVG("active");
        },

        //设置图像为活动状态并调整层次顺序
        setActiveStatus: function () {
            this.model.set("active", true);

            // Swap to top (z-index) 將元素移動到最上層
            this.$el.swapToBottom();
        },

        //移除图像
        remove: function () {
            this.model.set('active', false);
            this.model.destroy();
            this.$el.remove();   //从 DOM 中移除元素
        },

        //该方法 bindEvents 用于绑定图像编辑器中各种交互事件
        bindEvents: function () {
            // 拖动句柄的鼠标按下事件
            $(this.draggableHandle).bind("mousedown", this.draggableStart);
            $(this.draggableHandle).on("mousedown", this.setActiveStatus.bind(this));

            // 四个缩放句柄的鼠标按下事件
            $(this.ulResizableHandle).bind("mousedown", this.resizableStart);
            $(this.urResizableHandle).bind("mousedown", this.resizableStart);
            $(this.llResizableHandle).bind("mousedown", this.resizableStart);
            $(this.lrResizableHandle).bind("mousedown", this.resizableStart);
            //add
            $(this.eResizableHandle).bind("mousedown", this.e_resizableStart);  //change resizableStart to e_resizableStart
            //$(this.eResizableHandle).bind("mousedown", this.eResizableStart.bind(this));
            $(this.wResizableHandle).bind("mousedown", this.w_resizableStart); //改
            $(this.nResizableHandle).bind("mousedown", this.n_resizableStart);
            $(this.sResizableHandle).bind("mousedown", this.s_resizableStart);
            //add-end

            //旋转句柄的鼠标按下事件
            $(this.rotatableHandle).bind("mousedown", this.rotatableStart);

            //翻转和删除按钮的点击事件
            $(this.flipVertical).on("click", this.flipImageVerticalEvent.bind(this));
            $(this.flipHorizontal).on("click", this.flipImageHorizontalEvent.bind(this));
            $(this.removeHandle).on("click", this.remove.bind(this));

            // Mobile events
            var them = this;

            var mc = new Hammer.Manager($(this.draggableHandle)[0]);

            var pinch = new Hammer.Pinch();
            var rotate = new Hammer.Rotate();
            var pan = new Hammer.Pan();

            // we want to detect both the same time 缩放和旋转手势同时识别
            pinch.recognizeWith(rotate);

            // add to the Manager 添加手势到管理器
            mc.add([pinch, rotate, pan]);

            // ROTATE EVENT
            var currentRotation = them.model.get('rotation'), lastRotation, startRotation;

            mc.on('rotatemove', function (e) {
                // do something cool
                var diff = startRotation - Math.round(e.rotation);
                currentRotation = lastRotation - diff;

                them.model.set({
                    rotation: currentRotation
                });
            });
            mc.on('rotatestart', function (e) {
                lastRotation = currentRotation;
                startRotation = Math.round(e.rotation);
            });
            mc.on('rotateend', function (e) {
                // cache the rotation
                lastRotation = currentRotation;
            });

            // PINCH EVENT 缩放事件
            var w = them.model.get('width'), h = them.model.get('height');

            mc.on("pinch", function (e) {
                if (w * e.scale >= 300) {
                    them.model.set({
                        width: w * e.scale,
                        height: h * e.scale
                    });
                }
            });

            mc.on("pinchend", function (e) {
                w = w * e.scale;
                h = h * e.scale;
            });

            // PAN EVENT 平移事件
            var deltaX = them.model.get('x'), deltaY = them.model.get('y');

            mc.on('panmove', function (e) {
                var dX = deltaX + (e.deltaX);
                var dY = deltaY + (e.deltaY);

                them.model.set({
                    x: dX, y: dY
                });
            });

            mc.on('panend', function (e) {
                deltaX = deltaX + e.deltaX;
                deltaY = deltaY + e.deltaY;
            });
        },

        //render 方法用于将模型的数据渲染到 SVG 元素上，并设置一些必要的事件绑定和属性。
        render: function () {
            // 获取 SVG 模板并解析为 XML 片段
            var svgXml = this.templates.layer(this.model.attributes);
            var svgFragment = $.parseXML(svgXml);

            // write children to svg, using backbone view root tag instead
            while (svgFragment.documentElement.childElementCount > 0) {
                this.el.appendChild(svgFragment.documentElement.childNodes[0]);
            }

            //根据模型的类型创建相应的图层
            if (this.model.get("type") == "image") this.createImageLayer();
            else if (this.model.get("type") == "text") this.createTextLayer();
            else if (this.model.get("type") == "imageText") this.createImageTextLayer();

            //to find the class name called 'draggable-handle' 额外添加的可缩放句柄
            this.draggableHandle = this.$el.find("[class~='draggable-handle']");

            this.ulResizableHandle = this.$el.find("[class~='ul-resizable-handle']");
            this.urResizableHandle = this.$el.find("[class~='ur-resizable-handle']");
            this.llResizableHandle = this.$el.find("[class~='ll-resizable-handle']");
            this.lrResizableHandle = this.$el.find("[class~='lr-resizable-handle']");

            //add
            this.eResizableHandle = this.$el.find("[class~='e-resizable-handle']");
            this.wResizableHandle = this.$el.find("[class~='w-resizable-handle']");
            this.nResizableHandle = this.$el.find("[class~='n-resizable-handle']");
            this.sResizableHandle = this.$el.find("[class~='s-resizable-handle']");
            //add-end

            this.rotatableGroup = this.$el.find("[class~='rotatable-group']");
            this.flipGroup = this.$el.find("[class~='flip-group']");
            this.removeGroup = this.$el.find("[class~='remove-group']");
            this.rotatableHandle = this.$el.find("[class~='rotatable-handle']");

            //翻转图像并绑定事件
            this.flipVertical = this.$el.find("[class~='flip-vertical']");
            this.flipHorizontal = this.$el.find("[class~='flip-horizontal']");
            this.removeHandle = this.$el.find("[class~='remove-handle']");

            //this.model.set({"height": 60}); 监听大小变化和变换变化的事件
            this.flipImage();
            this.bindEvents();
            this.onSizeChange();
            this.onTransformChange();
        }
    });
});