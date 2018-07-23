var Generator = require('yeoman-generator');
var path = require('path');
var fs = require('fs');
var request = require('request-promise');
var Crypt = require('simple-crypto-js').default;
var os = require('os');
var Questions = require('./questions');

module.exports = class extends Generator {
    _private_get_valid_tag(tags) {
        return "TEST";
    }

    _private_map_workItems(workItems) {
        var result = [];
        for (var i = 0; i <= workItems.length - 1; i++) {
            var item = workItems[i];
            var title = item.fields["System.Title"];
            result.push({
                tag: this._private_get_valid_tag(item.fields["System.Tags"]),
                workItemType: item.fields["System.WorkItemType"].toUpperCase(),
                workItemTitle: title.endsWith('.') ? title : title + '.',
                id: item.id
            });
        }
        return result;
    }

    _private_autogen_secret() {
        var username = os.userInfo().username;
        var uid = os.userInfo().uid;
        var sum = 0;
        for (var i = 0; i <= username.length - 1; i++) {
            sum += username.charCodeAt(i) * uid;
        }
        return sum.toString();
    }

    _private_get_token(token, config, crypt) {
        return token || crypt.decrypt(config.get('token'));
    }

    initializing() {
        this.sourceRoot(path.resolve(this.contextRoot,'templates'));
    }

    prompting() {
        let instance = this;

        var secret = this._private_autogen_secret();
        var crypt = new Crypt(secret);

        return this.prompt([
            Questions.getUsername(),
            Questions.getTokenSelect(this.config.get('token')),
            Questions.getToken(),
            Questions.getTfsUrl(),
            Questions.getTfsCollection(),
            Questions.getTfsTeam(),
            Questions.getTfsRepository(this.config.get('tfsRepository'), t => this._private_get_token(t, this.config, crypt)),
            Questions.getPullRequest(),
            Questions.getDestination()
        ]).then((answers) => {
            var token = this._private_get_token(answers.token, this.config, crypt);
            answers.token = token;
            var crypted = crypt.encrypt(token);
            if (crypted !== this.config.get('token')) {
                this.config.set('token', crypted);
            }
            this.config.set('tfsRepository', answers.tfsRepository);
            this.config.save();
            this.answers = answers;
        });
    }

    writing() {
        var url = `${this.answers.tfsUrl}/${this.answers.tfsCollection}/_apis/git/repositories/${this.answers.tfsRepository}/pullrequests/${this.answers.pullRequestId}/workitems?resource=pullRequestWorkItems?api-version=4.1`;
        var requestOpts = {
            method: 'GET',
            uri: url,
            json: true,
            auth: {
                username: this.answers.username,
                password: this.answers.token,
                sendImmediately: true
            }
        };
        request(requestOpts).then(body => {
            var workItems = [];
            var requests = [];
            for (var i = 0; i < body.count - 1; i++) {
                var workItem = body.value[i];
                var itemUrl = `${this.answers.tfsUrl}/${this.answers.tfsCollection}/_apis/wit/workitems/${workItem.id}?fields=System.Title,System.Tags,System.WorkItemType&api-version=4.1`;
                requests.push(
                    request(Object.assign({}, requestOpts, { 'uri': itemUrl }))
                );
            }

            Promise.all(requests)
                .then(wi => {
                    var dest = path.resolve(this.answers.dest, 'CHANGELOG.md');
                    this.fs.copyTpl(
                        this.templatePath('CHANGELOG.md'),
                        this.destinationPath(dest),
                        {
                            items: this._private_map_workItems(wi)
                        }
                    );
                });
        }).catch(r => console.log(r));
    }
};