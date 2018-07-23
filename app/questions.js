var request = require('request-promise');

module.exports = class {
    static getTokenSelect(oldToken) {
        return {
            type: 'list',
            name: 'tokenSelect',
            message: 'Access Token',
            choices: ['Last used', 'Provide new'],
            when: a => {
                return !!oldToken;
            }
        };
    };

    static getUsername() {
        return {
            type: 'input',
            name: 'username',
            message: 'what\'s your username?',
            store: true
        };
    };

    static getToken() {
        return {
            type: 'password',
            name: 'token',
            message: 'what\'s your access token?',
            when: a => {
                return !a.tokenSelect || a.tokenSelect === "Provide";
            }
        };
    };

    static getPullRequest() {
        return {
            type: 'autocomplete',
            name: 'pullRequestId',
            message: 'Wich Pull Request? (id)'
        };
    };

    static getDestination() {
        return {
            type: 'input',
            name: 'dest',
            message: 'Destination folder',
            store: true
        };
    };

    static getTfsUrl() {
        return {
            type: 'input',
            name: 'tfsUrl',
            message: 'Tfs server url (https)',
            store: true,
            validate: v => {
                return v.toLowerCase().startsWith("https://") && v.charAt(v.length - 1) !== '/';
            },
            filter: v => {
                var url = v.endsWith('/') ? v.substring(0, v.length - 1) : v;
                return url.indexOf('://') === -1 ? 'https://' + url : url;
            }
        };
    };

    static getTfsCollection() {
        return {
            type: 'input',
            name: 'tfsCollection',
            message: 'Collection name',
            store: true
        };
    };

    static getTfsTeam() {
        return {
            type: 'input',
            name: 'tfsTeam',
            message: 'Team name',
            store: true
        };
    };

    static getTfsRepository(repository, getToken) {
        return {
            type: 'list',
            name: 'tfsRepository',
            message: 'Repository name',
            default: repository,
            pageSize: 10,
            choices: a => {
                var requestOpts = {
                    method: 'GET',
                    uri: `${a.tfsUrl}/${a.tfsCollection}/${a.tfsTeam}/_apis/git/repositories/`,
                    json: true,
                    auth: {
                        username: a.username,
                        password: getToken(a.token),
                        sendImmediately: true
                    }
                };
                return request(requestOpts).then(b => {
                    var opts = []
                    for (var i = 0; i <= b.count - 1; i++) {
                        var repo = b.value[i];
                        opts.push({
                            value: repo.id,
                            name: repo.name,
                            short: repo.name
                        })
                    }
                    return opts;
                })
            }
        };
    };
}