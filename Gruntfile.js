const pkg = require('./package.json');

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: pkg,

        browserify: {
            pkgjs: {
                src: ['./package.json'],
                dest: 'build/package.js',
                options: {
                    browserifyOptions: {
                        standalone: 'pkg'
                    }
                }
            },
        },

        less: {
            dist: {
                options: {
                    paths: ["assets/css"]
                },
                files: {"build/index.css": "index.less"}
            }
        },

        concat: {
            js: {
                src: [
                    'build/package.js',
                    'node_modules/jquery/dist/jquery.js',
                    'node_modules/components-jqueryui/jquery-ui.js',
                    'node_modules/free-jqgrid/dist/jquery.jqgrid.src.js',
                    'node_modules/free-jqgrid/dist/plugins/ui.multiselect.js',
                    'node_modules/store-js/dist/store.legacy.js',
                    'node_modules/paho-mqtt/paho-mqtt.js'
                ],
                dest: 'dist/bundle.js'
            },
            css: {
                src: [
                    'node_modules/components-jqueryui/themes/base/jquery-ui.css',
                    'node_modules/components-jqueryui/themes/redmond/jquery-ui.css',
                    'node_modules/free-jqgrid/dist/css/ui.jqgrid.css',
                    'node_modules/free-jqgrid/dist/plugins/css/ui.multiselect.css',
                    'build/index.css'
                ],
                dest: 'dist/bundle.css'
            }
        },

        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            'node_modules/components-jqueryui/themes/redmond/images/*'
                        ],
                        dest: 'dist/images/'
                    },
                    {
                        src: [
                            'index.html',
                            'index.js',

                        ],
                        dest: 'dist/'
                    }
                ]
            }
        },

        clean: {
            build: [
                'build/',
                'dist/',
                'node_modules/',
                'package-lock.json'
            ]
        }
        
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['browserify', 'less', 'concat', 'copy']);
};