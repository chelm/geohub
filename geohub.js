var request = require('request');
var async = require('async');

module.exports = {

    // scan repo for "geojson files"
    repo: function (user, repo, path, token, callback) {
        if (user && repo && path) {
            var urls = ['https://api.github.com/repos/' + user + '/' + repo + '/contents/' + path + '.geojson' + ((token) ? '?access_token=' + token : ''), 'https://raw.github.com/' + user + '/' + repo + '/master/' + path + '.geojson'];

            function dealWithJson(err, files) {
                if (err) {
                    return callback(err);
                }
                var file = files[0];
                var json = files[1];
                var name = file.name;
                var sha = file.sha;
                var geojson = null;
                if (json.type && json.type === 'FeatureCollection') {
                    json.name = name;
                    json.sha = sha;
                    geojson = json;
                }
                if (geojson) {
                    callback(null, geojson);
                } else {
                    callback('Error: could not find any geojson at ' + url, null);
                }
            };
            async.map(urls, function (url, cb) {
                request(url, {
                    json: true
                }, function (err, response, file) {
                    if (err || response.statusCode < 200) {
                        cb(err || response.statusCode)
                    } else {
                        cb(null, file);
                    }
                });
            }, dealWithJson)
        } else if (user && repo) {
            // scan the repo contents 
            url = 'https://api.github.com/repos/' + user + '/' + repo + '/contents' + ((token) ? '?access_token=' + token : '');
            request(url, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var files = [];
                    var json = JSON.parse(body);
                    json.forEach(function (file) {
                        if (file.name.match(/geojson/)) {
                            files.push(file);
                        }
                    });
                    if (files.length) {
                        self.getRepoFiles('https://raw.github.com/' + user + '/' + repo + '/master/', files, callback);
                    } else {
                        callback('Error: could not find any geojson at ' + url, null);
                    }
                } else {
                    callback('Error: ' + error);
                }
            });
        } else {
            callback("Error: must specify at least a username and repo");
        }
    },

    repoSha: function (user, repo, path, token, callback) {
        var url = 'https://api.github.com/repos/' + user + '/' + repo + '/contents/' + path + ((token) ? '?access_token=' + token : '');
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                if (body.message) {
                    callback(body.message, null);
                } else {
                    callback(null, body.sha);
                }
            } else {
                callback('Error: could not get sha for ' + url, null);
            }
        });
    },

    getRepoFiles: function (url, files, callback) {
        var data = [],
            errorCatch = false,
            json;

        var done = function (fname) {
            if (data.length == files.length) {
                callback(null, data);
            } else if (errorCatch) {
                callback('Error: could not access file ' + url + '/' + fname, null);
            }
        };

        files.forEach(function (f) {
            request(url + f.name, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    try {
                        json = JSON.parse(body);
                        if (json.type && json.type == 'FeatureCollection') {
                            json.name = f.name;
                            json.sha = f.sha;
                            data.push(json);
                        }
                    } catch (e) {
                        errorCatch = true;
                    }
                } else {
                    errorCatch = true;
                }
                done(f.name);
            });
        });
    },

    gist: function (options, callback) {
        var url = 'https://api.github.com/gists/' + options.id + ((options.token) ? '?access_token=' + options.token : '');
        request.get(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                geojson = [];

                for (var f in body.files) {
                    var file = body.files[f],
                        content = file.content;

                    try {
                        var json = JSON.parse(content);
                        if (json.type && json.type === 'FeatureCollection') {
                            json.name = file.filename;
                            json.updated_at = body.updated_at;
                            geojson.push(json);
                        }
                    } catch (e) {
                        callback('Error: could not parse file contents' + e, null);
                    }

                }
                // got some geojson 
                if (geojson.length) {
                    callback(null, geojson);
                } else {
                    callback('Error: could not find any geojson in gist #' + id, null);
                }
            } else if (response.statusCode === 404) {
                callback("Gist not found at: " + url, null);
            } else {
                callback("Error '" + error + "' occurred reading from " + url, null);
            }
        });
    },

    gistSha: function (id, token, callback) {
        var url = 'https://api.github.com/gists/' + id + ((token) ? '?access_token=' + token : '');
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                body = JSON.parse(body);
                if (body.message) {
                    callback(body.message, null);
                } else {
                    callback(null, body.updated_at);
                }
            } else {
                callback('Error: could not get gist at ' + url, null);
            }
        });
    }
};
