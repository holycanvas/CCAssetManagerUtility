/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
const packManager = require('./pack-manager');
const Pipeline = require('./CCPipeline');
const caches = require('./caches');
const { getDepends, forEach } = require('./utilities');

function prefetch (task, done) {
    var options = task.options, exclude = options.exclude = options.exclude || {}, depends = [], onError = task.onError;
    task.output = [];

    forEach(task.input, function (item, cb) {
        var key = item.uuid || item.url;
            
        if (!item.isNative && caches.assets.has(key)) {
            if (!asset.__nativeDepend__) return cb(); 
            return cb(getDepends(key, null, exclude, depends, true));
        }

        if (caches.files.has(item.url)) {
            if (item.isNative) return cb();
            cb(getDepends(key, null, exclude, depends, true));
        }
        else {
            item.ext = 'prefetch';
            packManager.load(item, task.options, function (err, data) {
                err && item.onError && item.onError(err);
                if (task.isFinish) return item.destroy();
                if (!err) {
                    if (item.isNative) err = getDepends(key, data, exclude, depends, true);
                }
                else if (options.ignoreError) {
                    err = null;
                }
                else {
                    item.destroy();
                }
                cb(err);
            });
        }
        
    }, function (err) {
        if (!err) {
            if (depends.length > 0) {
                // stage 2 , download depend asset
                var subTask = new Pipeline.Task({
                    name: task.name + ' dependencies',
                    input: depends,
                    onError,
                    onComplete: function (err, out) {
                        if (task.isFinish) return;
                        done(err);
                    },
                    options: task.options
                }); 
                cc.assetManager._prefetchPipeline.async(subTask);
                return;
            }
        }
        for (var i = 0, l = task.input.length; i < l; i++) {
            task.input[i].destroy();
        }
        
        done(err);
    });
}


module.exports = prefetch;