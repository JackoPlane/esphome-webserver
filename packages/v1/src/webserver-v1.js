const source = new EventSource("/events");

source.addEventListener('log', function (e) {
    const log = document.getElementById("log");
    let log_prefs = [
        ["\u001b[1;31m", 'e'],
        ["\u001b[0;33m", 'w'],
        ["\u001b[0;32m", 'i'],
        ["\u001b[0;35m", 'c'],
        ["\u001b[0;36m", 'd'],
        ["\u001b[0;37m", 'v'],
        ];

    let klass = '';
    let colorPrefix = '';
    for (const log_pref of log_prefs){
        if (e.data.startsWith(log_pref[0])) {
            klass = log_pref[1];
            colorPrefix = log_pref[0];
        }
    }

    if (klass == ''){
        log.innerHTML += e.data + '\n';
        return;
    }

    // Extract content without color codes and ANSI termination
    const content = e.data.substr(7, e.data.length - 11);

    // Split by newlines to handle multi-line messages
    const lines = content.split('\n');

    // Extract header from first line (everything up to and including ']:')
    let header = '';
    const headerMatch = lines[0].match(/^(.*?\]:)/);
    if (headerMatch) {
        header = headerMatch[1];
    }

    // Process each line
    lines.forEach((line, index) => {
        if (line) {
            if (index === 0) {
                // First line - display as-is
                log.innerHTML += '<span class="' + klass + '">' + line + "</span>\n";
            } else {
                // Continuation lines - prepend with header
                log.innerHTML += '<span class="' + klass + '">' + header + line + "</span>\n";
            }
        }
    });
});

actions = [
    ["switch", ["toggle"]],
    ["light", ["toggle"]],
    ["fan", ["toggle"]],
    ["cover", ["open", "close"]],
    ["button", ["press"]],
    ["lock", ["lock", "unlock", "open"]],
    ];
multi_actions = [
    ["select", "option"],
    ["number", "value"],
    ];

source.addEventListener('state', function (e) {
    const data = JSON.parse(e.data);
    document.getElementById(data.id).children[1].innerText = data.state;
});

// Build URL path for entity
// New firmware: uses data attributes -> /{domain}/{device?}/{name}/{action}
// Old firmware: parses from id attribute -> /{domain}/{object_id}/{action}
function buildEntityUrl(row, action) {
    // Check for new firmware (has data-domain attribute)
    if (row.dataset.domain) {
        const domain = row.dataset.domain;
        const name = encodeURIComponent(row.dataset.name);
        const device = row.dataset.device;
        if (device) {
            return '/' + domain + '/' + encodeURIComponent(device) + '/' + name + '/' + action;
        }
        return '/' + domain + '/' + name + '/' + action;
    }
    // Fall back to old format: id is "domain-object_id"
    const parts = row.id.split('-');
    const domain = parts[0];
    const objectId = parts.slice(1).join('-');
    return '/' + domain + '/' + objectId + '/' + action;
}

const states = document.getElementById("states");
let i = 0, row;
for (; row = states.rows[i]; i++) {
    if (!row.children[2].children.length) {
        continue;
    }

    for (const domain of actions){
        if (row.classList.contains(domain[0])) {
            for (let j=0;j<row.children[2].children.length && j < domain[1].length; j++){
                row.children[2].children[j].addEventListener('click', function () {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", buildEntityUrl(row, domain[1][j]), true);
                    xhr.send();
                });
            }
        }
    }
    for (const domain of multi_actions){
        if (row.classList.contains(domain[0])) {
            row.children[2].children[0].addEventListener('change', function () {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", buildEntityUrl(row, 'set') + '?' + domain[1] + '=' + encodeURIComponent(this.value), true);
                xhr.send();
            });
        }
    }
}