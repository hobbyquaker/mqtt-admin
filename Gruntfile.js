
module.exports = function (grunt) {
    grunt.config.data.bower = require('./bower.json');
    grunt.initConfig({
        "steal-build": {
            bundle: {
                options: {
                    system: {
                        config: "bower.json!bower"
                    }
                }
            }
        },
        copy: {
            release: {
                files: [
                    {
                        expand: true,
                        src: [
                            'bower_components/steal/steal.production.js',
                            'bower_components/jquery-ui/themes/redmond/images/**',
                            'dist/bundles/**',
                            'LICENSE',
                            'README.md'
                        ],
                        dest: 'tmp/'
                    }
                ]
            }
        },
        clean: {
            release: ["tmp"]
        },
        'string-replace': {
            release: {
                files: {
                    'tmp/': 'index.html'
                },
                options: {
                    replacements: [{
                        pattern: 'bower_components\/steal\/steal\.js',
                        replacement: 'bower_components/steal/steal.production.js'
                    }]
                }
            }
        },
        zip: {
            'release': {
                router: function (filepath) {
                    return filepath.replace(/^tmp/, 'mqtt-admin');
                },
                src: ['tmp/**'],
                dest: 'releases/mqtt-admin_' + grunt.config.data.bower.version + '.zip'
            }
        },
        bump: {
            options: {
                files: ['bower.json'],
                updateConfigs: ['bower'],
                commit: false,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: false,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                regExp: false,
                prereleaseName: 'beta'
            }
        }
    });

    grunt.loadNpmTasks("steal-tools");
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask("build", ["steal-build", "clean", "copy", "string-replace"]);
    grunt.registerTask("release prerelease", ["bump:prerelease", "build", "zip"]);
    grunt.registerTask("release patch", ["bump:patch", "build", "zip"]);
    grunt.registerTask("release minor", ["bump:minor", "build", "zip"]);
    grunt.registerTask("release major", ["bump:major", "build", "zip"]);
    grunt.registerTask("release premajor", ["bump:premajor", "build", "zip"]);


};