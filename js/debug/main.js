var wavesurfer = Object.create(WaveSurfer);

// global variables
var transcript;
var silences;
var highlights;
var strikes;
var pastStack = Array();
var futureStack = Array();
var pageOptions;
var getParams;

var skipSilences = false;
var playHighlights = false;

// mutation observers
var wordChildObserver; // firefox
var nodeObserver;
var wordObserver;

var GLOBAL_ACTIONS = {

    'play': function() {
        togglePlayPause();
        wavesurfer.playPause();
    },

    'stop': function() {
        togglePlayPause();
        wavesurfer.stop();
        readWords();
    },

    'rewind': function() {
        wavesurfer.skipBackward(5);
    },

    'speedx05': function() {
        wavesurfer.setPlaybackRate(0.5);
        activeSpeed();
    },

    'speedx1': function() {
        wavesurfer.setPlaybackRate(1);
        activeSpeed();
    },

    'speedx125': function() {
        wavesurfer.setPlaybackRate(1.25);
        activeSpeed();
    },

    'speedx15': function() {
        wavesurfer.setPlaybackRate(1.5);
        activeSpeed();
    },

    'speedx175': function() {
        wavesurfer.setPlaybackRate(1.75);
        activeSpeed();
    },

    'speedx2': function() {
        wavesurfer.setPlaybackRate(2);
        activeSpeed();
    },

    'skipsilence': function() {
        skipSilences = !skipSilences;
    },

    'playhighlight': function() {
        if(!playHighlights) {
            getHighlights();
            if (highlights.length>0)
                wavesurfer.seekTo(highlights[0] / wavesurfer.getDuration());
        }
        playHighlights = !playHighlights;
    },

    'toggle-hints': function() {
        var hintSwitch = document.getElementById('hints-switch');
        hintSwitch.classList.toggle('off');
        document.getElementById('hints').classList.toggle('hidden');
        if(/off/i.test(hintSwitch.classList.toString())) {
            hintSwitch.innerHTML = 'Turn Hints On';
            setCookie('hints', 'off');
        } else {
            hintSwitch.innerHTML = 'Turn Hints Off';
            setCookie('hints', 'on');
        }
    },

    'toggle-help': function() {
        var helpSwitch = document.getElementById('help-switch');
        helpSwitch.classList.toggle('off');
        if(/off/i.test(helpSwitch.classList.toString())) {
            helpSwitch.innerHTML = 'Show at Startup';
            setCookie('help', 'off');
        } else {
            helpSwitch.innerHTML = 'Don\'t Show at Startup';
            setCookie('help', 'on');
        }
    },

    'save': function() {
        saveJSON(true);
    },

    'close-export': function() {
        document.getElementById('export-wrapper').classList.add('invisible');
        setTimeout(function() {
            document.getElementById('export-wrapper').classList.add('hidden');
        }, 50);
    },

    'close-help': function() {
        document.getElementById('help-wrapper').classList.add('invisible');
        setTimeout(function() {
            document.getElementById('help-wrapper').classList.add('hidden');
        }, 50);
    },

    'export-srt': function() {
        var results = transcript.results[0].results;
        var speakers = transcript.results[0].speaker_labels;
        var counter = 1;
        var i = 0;
        var srt = Array();
        var currentSpeaker, prevSpeaker;
        var sentence;
        var onlyHighlight = document.getElementById('export-highlight').checked;

        results.forEach(function(result, resultIndex) {
            var maxConfidence = 0;
            var maxAlternative;
            result.alternatives.forEach(function(alternative, alternativeIndex) {
                if(alternative.confidence > maxConfidence) {
                    maxAlternative = alternative;
                    maxAlternativeIndex = alternativeIndex;
                }
            });
            sentence = '';
            maxAlternative.timestamps.forEach(function(word, wordIndex) {
                currentSpeaker = speakers[i++].speaker;
                if(onlyHighlight) {
                    if(word[3]) {
                        if(word[3].highlight) {
                            if(currentSpeaker != prevSpeaker) {
                                sentence += '(' + currentSpeaker + ')';
                            }
                            sentence += '<b>' + word[0] + '</b>';
                        }
                    }
                } else {
                    if(currentSpeaker != prevSpeaker) {
                        sentence += '(' + currentSpeaker + ') ';
                    }
                    if(word[3]) {
                        if(!word[3].strike) {
                            if(word[3].highlight) {
                                sentence += '<b>' + word[0] + '</b>';
                            } else {
                                sentence += word[0];
                            }
                        }
                    } else {
                        sentence += word[0];
                    }
                }
                prevSpeaker = currentSpeaker;
            });
            if(sentence.trim() != '') {
                srt.push((counter++) + '\n');
                srt.push(toHHMMssmmm(maxAlternative.timestamps[0][1]) + ' --> ' + toHHMMssmmm(maxAlternative.timestamps[maxAlternative.timestamps.length - 1][2]) + '\n');
                srt.push(sentence + '\n\n');
            }
        });

        var blob = new Blob(srt, {type: 'text/srt'});
        saveAs(blob, 'transcript.srt');

        GLOBAL_ACTIONS['close-export']();
    },

    'export-vtt': function() {
        var results = transcript.results[0].results;
        var speakers = transcript.results[0].speaker_labels;
        var counter = 1;
        var i = 0;
        var vtt = Array();
        var currentSpeaker, prevSpeaker;
        var sentence;
        var onlyHighlight = document.getElementById('export-highlight').checked;

        vtt.push('WEBVTT\n\n');

        results.forEach(function(result, resultIndex) {
            var maxConfidence = 0;
            var maxAlternative;
            result.alternatives.forEach(function(alternative, alternativeIndex) {
                if(alternative.confidence > maxConfidence) {
                    maxAlternative = alternative;
                    maxAlternativeIndex = alternativeIndex;
                }
            });
            sentence = '';
            maxAlternative.timestamps.forEach(function(word, wordIndex) {
                currentSpeaker = speakers[i++].speaker;
                if(onlyHighlight) {
                    if(word[3]) {
                        if(word[3].highlight) {
                            if(currentSpeaker != prevSpeaker) {
                                sentence += '(' + currentSpeaker + ') ';
                            }
                            sentence += '<b>' + word[0] + '</b>';
                        }
                    }
                } else {
                    if(currentSpeaker != prevSpeaker) {
                        sentence += '(' + currentSpeaker + ') ';
                    }
                    if(word[3]) {
                        if(!word[3].strike) {
                            if(word[3].highlight) {
                                sentence += '<b>' + word[0] + '</b>';
                            } else {
                                sentence += word[0];
                            }
                        }
                    } else {
                        sentence += word[0];
                    }
                }
                prevSpeaker = currentSpeaker;
            });
            if(sentence.trim() != '') {
                vtt.push((counter++) + '\n');
                vtt.push(toHHMMssmmm(maxAlternative.timestamps[0][1]).replace(',', '.') + ' --> ' + toHHMMssmmm(maxAlternative.timestamps[maxAlternative.timestamps.length - 1][2]).replace(',', '.') + '\n');
                vtt.push(sentence + '\n\n');
            }
        });

        var blob = new Blob(vtt, {type: 'text/vtt'});
        saveAs(blob, 'transcript.vtt');

        GLOBAL_ACTIONS['close-export']();
    },

    'export-pdf': function() {
        var results = transcript.results[0].results;
        var speakers = transcript.results[0].speaker_labels;
        var words = Array();
        var currentSpeaker, nextSpeaker;
        var sentence = '';
        var onlyHighlight = document.getElementById('export-highlight').checked;
        var noTimestamps = document.getElementById('no-timestamps').checked;

        results.forEach(function(result, resultIndex) {
            var maxConfidence = 0;
            var maxAlternative;
            result.alternatives.forEach(function(alternative, alternativeIndex) {
                if(alternative.confidence > maxConfidence) {
                    maxAlternative = alternative;
                    maxAlternativeIndex = alternativeIndex;
                }
            });
            maxAlternative.timestamps.forEach(function(word, wordIndex) {
                words.push(word);
            });
        });

        for(var i = 0; i < words.length - 1;) {
            currentSpeaker = speakers[i].speaker;
            nextSpeaker = speakers[i + 1].speaker;
            if(onlyHighlight){
                var currentPara = currentSpeaker + ': ';
                if(!noTimestamps) { currentPara += '[' + toHHMMssmmm(words[i][1]).replace(',', '.') + ']'; }
            } else {
                sentence += currentSpeaker + ': ';
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i][1]).replace(',', '.') + '] '; }
            }
            do {
                try {
                    nextSpeaker = speakers[i + 1].speaker;
                } catch(exception) {
                    nextSpeaker = null;
                }
                if(onlyHighlight) {
                    if(words[i][3]) {
                        if(words[i][3].highlight) {
                            sentence += currentPara;
                            currentPara = '';
                            sentence += words[i][0];
                        }
                    }
                } else {
                    if(words[i][3]) {
                        if(!words[i][3].strike) {
                            if(words[i][3].highlight) {
                                sentence += words[i][0];
                            } else {
                                sentence += words[i][0];
                            }
                        }
                    } else {
                        sentence += words[i][0];
                    }
                }
                i++;
            } while(currentSpeaker == nextSpeaker && i < words.length);
            if(onlyHighlight && currentPara == '') {
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i - 1][2]).replace(',', '.') + ']'; }
                sentence += '\n\n';
            } else if(!onlyHighlight && !currentPara) {
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i - 1][2]).replace(',', '.') + ']'; }
                sentence += '\n\n';
            }
        }

        var pdf = new jsPDF();
        pdf.setFontSize(10);
        var splitSentence = pdf.splitTextToSize(sentence, 160);
        while(splitSentence.length > 0) {
            pdf.text(splitSentence.splice(0, 70), 10, 10);
            pdf.addPage();
        }
        pdf.save('transcript.pdf');

        GLOBAL_ACTIONS['close-export']();
    },

    'export-doc': function() {
        var results = transcript.results[0].results;
        var speakers = transcript.results[0].speaker_labels;
        var words = Array();
        var currentSpeaker, nextSpeaker;
        var sentence = '';
        var onlyHighlight = document.getElementById('export-highlight').checked;
        var noTimestamps = document.getElementById('no-timestamps').checked;

        results.forEach(function(result, resultIndex) {
            var maxConfidence = 0;
            var maxAlternative;
            result.alternatives.forEach(function(alternative, alternativeIndex) {
                if(alternative.confidence > maxConfidence) {
                    maxAlternative = alternative;
                    maxAlternativeIndex = alternativeIndex;
                }
            });
            maxAlternative.timestamps.forEach(function(word, wordIndex) {
                words.push(word);
            });
        });

        for(var i = 0; i < words.length - 1;) {
            currentSpeaker = speakers[i].speaker;
            nextSpeaker = speakers[i + 1].speaker;
            if(onlyHighlight){
                var currentPara = '<w:p><w:r><w:t>' + currentSpeaker + ': ';
                if(!noTimestamps) { currentPara += '[' + toHHMMssmmm(words[i][1]).replace(',', '.') + ']'; }
                currentPara += ' </w:t></w:r>';
            } else {
                sentence += '<w:p><w:r><w:t>' + currentSpeaker + ': ';
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i][1]).replace(',', '.') + ']'; }
                sentence += ' </w:t></w:r>';
            }
            do {
                try {
                    nextSpeaker = speakers[i + 1].speaker;
                } catch(exception) {
                    nextSpeaker = null;
                }
                if(onlyHighlight) {
                    if(words[i][3]) {
                        if(!words[i][3].strike) {
                            if(words[i][3].highlight) {
                                sentence += currentPara;
                                currentPara = '';
                                sentence += '<w:r><w:rPr><w:highlight w:val="yellow" /></w:rPr><w:t>' + words[i][0] + '</w:t></w:r>';
                            }
                        }
                    }
                } else {
                    if(words[i][3]) {
                        if(!words[i][3].strike) {
                            if(words[i][3].highlight) {
                                sentence += '<w:r><w:rPr><w:highlight w:val="yellow" /></w:rPr><w:t>' + words[i][0] + '</w:t></w:r>';
                            } else {
                                sentence += '<w:r><w:t>' + words[i][0] + '</w:t></w:r>';
                            }
                        }
                    } else {
                        sentence += '<w:r><w:t>' + words[i][0] + '</w:t></w:r>';
                    }
                }
                i++;
            } while(currentSpeaker == nextSpeaker && i < words.length);
            if(onlyHighlight && currentPara == '') {
                sentence += '<w:r><w:t> ';
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i - 1][2]).replace(',', '.') + ']'; }
                sentence += '\n\n</w:t></w:r></w:p>';
            } else if(!onlyHighlight && !currentPara) {
                sentence += '<w:r><w:t> ';
                if(!noTimestamps) { sentence += '[' + toHHMMssmmm(words[i - 1][2]).replace(',', '.') + ']'; }
                sentence += '\n\n</w:t></w:r></w:p>';
            }
        }

        function loadFile(url, callback){
            JSZipUtils.getBinaryContent(url, callback);
        }

        loadFile("./src/template.docx", function(error, content){
            if (error) { throw error };
            var zip = new JSZip(content);
            var doc = new Docxtemplater().loadZip(zip)
            doc.setData({ xml: sentence });

            try {
                doc.render()
            } catch (error) {
                var e = {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    properties: error.properties,
                }
                throw error;
            }

            var out = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            saveAs(out,"transcript.docx");
        });

        GLOBAL_ACTIONS['close-export']();
    },

    'close-find-replace': function() {
        document.getElementById('find-replace-wrapper').classList.add('invisible');
        setTimeout(function() {
            document.getElementById('find-replace-wrapper').classList.add('hidden');
        }, 50);
        [].forEach.call(document.querySelectorAll('.found'), function(el) {
            el.classList.remove('found');
        });
    },

    'strike': function() {
        pastStack.push(JSON.stringify(transcript));
        if(window.getSelection && window.getSelection().toString().split('').length > 1) {
            var startElement = window.getSelection().anchorNode.parentElement;
            if(startElement.classList[0] != 'word') {
                startElement = startElement.nextSibling;
            }
            var endElement = window.getSelection().focusNode.parentElement;
            if(endElement.classList[0] != 'word') {
                endElement = endElement.nextSibling;
            }
            if(Number(startElement.id) > Number(endElement.id)) {
                var temp = startElement;
                startElement = endElement;
                endElement = temp;
            }
            var currentNode = document.getElementById(startElement.id);
            while(Number(currentNode.id) <= Number(endElement.id)) {
                currentNode.classList.toggle('strike');
                if(/highlight/i.test(currentNode.classList.toString())) {
                    currentNode.classList.remove('highlight');
                }
                sWaveId = 's' + currentNode.id;
                hWaveId = 'h' + currentNode.id;
                if(sWaveId in wavesurfer.regions.list) {
                    wavesurfer.regions.list[sWaveId].remove();
                } else {
                    if(hWaveId in wavesurfer.regions.list) {
                        wavesurfer.regions.list[hWaveId].remove();
                    }
                    wavesurfer.addRegion({
                        id: sWaveId,
                        start: currentNode.getAttribute('starttime'),
                        end: currentNode.getAttribute('endtime'),
                        color: 'rgba(100, 100, 100, 0.5)',
                        drag: false,
                        resize: false
                    });
                }

                var r_i = currentNode.getAttribute('resultindex');
                var a_i = currentNode.getAttribute('alternativeindex');
                var w_i = currentNode.getAttribute('wordindex');

                if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3]) {
                    if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike) {
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
                    } else {
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = true;
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
                    }
                } else {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3] = {};
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = true;
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
                }

                if(currentNode.nextSibling) {
                    currentNode = currentNode.nextSibling;
                } else {
                    break;
                }
            }
        } else {
            var readEle = document.getElementsByClassName('read');

            if(readEle.length <= 0) {
                currentNode = document.getElementsByClassName('word')[0];
            } else if(readEle[readEle.length - 1].nextSibling) {
                currentNode = readEle[readEle.length - 1].nextSibling;
            } else if (readEle[readEle.length - 1].parentNode.nextSibling.nextSibling.nextSibling) {
                currentNode = readEle[readEle.length - 1].parentNode.nextSibling.nextSibling.nextSibling.firstChild;
            } else {
                currentNode = readEle[readEle.length - 1];
            }
            currentNode.classList.toggle('strike');
            if(/highlight/i.test(currentNode.classList.toString())) {
                currentNode.classList.remove('highlight');
            }
            sWaveId = 's' + currentNode.id;
            hWaveId = 'h' + currentNode.id;

            if(sWaveId in wavesurfer.regions.list) {
                wavesurfer.regions.list[sWaveId].remove();
            } else {
                if(hWaveId in wavesurfer.regions.list) {
                    wavesurfer.regions.list[hWaveId].remove();
                }
                wavesurfer.addRegion({
                    id: sWaveId,
                    start: currentNode.getAttribute('starttime'),
                    end: currentNode.getAttribute('endtime'),
                    color: 'rgba(100, 100, 100, 0.5)',
                    drag: false,
                    resize: false
                });
            }

            var r_i = currentNode.getAttribute('resultindex');
            var a_i = currentNode.getAttribute('alternativeindex');
            var w_i = currentNode.getAttribute('wordindex');

            if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3]) {
                if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike) {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
                } else {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = true;
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
                }
            } else {
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3] = {};
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = true;
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
            }
        }

        getStrikes();
        if(playHighlights) {
            getHighlights();
        }
    },

    'highlight': function() {
        pastStack.push(JSON.stringify(transcript));
        if(window.getSelection && window.getSelection().toString().split('').length > 1) {
            var startElement = window.getSelection().anchorNode.parentElement;
            while(startElement.classList[0] != 'word') {
                startElement = startElement.nextSibling;
            }
            var endElement = window.getSelection().focusNode.parentElement;
            while(endElement.classList[0] != 'word') {
                endElement = endElement.nextSibling;
            }
            if(Number(startElement.id) > Number(endElement.id)) {
                var temp = startElement;
                startElement = endElement;
                endElement = temp;
            }
            var currentNode = document.getElementById(startElement.id);
            while(Number(currentNode.id) <= Number(endElement.id)) {
                currentNode.classList.toggle('highlight');
                if(/strike/i.test(currentNode.classList.toString())) {
                    currentNode.classList.remove('strike');
                }
                sWaveId = 's' + currentNode.id;
                hWaveId = 'h' + currentNode.id;
                if(hWaveId in wavesurfer.regions.list) {
                    wavesurfer.regions.list[hWaveId].remove();
                } else {
                    if(sWaveId in wavesurfer.regions.list) {
                        wavesurfer.regions.list[sWaveId].remove();
                    }
                    wavesurfer.addRegion({
                        id: hWaveId,
                        start: currentNode.getAttribute('starttime'),
                        end: currentNode.getAttribute('endtime'),
                        color: 'rgba(255, 255, 0, 0.3)',
                        drag: false,
                        resize: false
                    });
                }

                var r_i = currentNode.getAttribute('resultindex');
                var a_i = currentNode.getAttribute('alternativeindex');
                var w_i = currentNode.getAttribute('wordindex');

                if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3]) {
                    if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight) {
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
                    } else {
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = true;
                        transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
                    }
                } else {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3] = {};
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = true;
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
                }

                if(currentNode.nextSibling) {
                    currentNode = currentNode.nextSibling;
                } else {
                    break;
                }
            }
        } else {
            var readEle = document.getElementsByClassName('read');

            if(readEle.length <= 0) {
                currentNode = document.getElementsByClassName('word')[0];
            } else if(readEle[readEle.length - 1].nextSibling) {
                currentNode = readEle[readEle.length - 1].nextSibling;
            } else if (readEle[readEle.length - 1].parentNode.nextSibling.nextSibling.nextSibling) {
                currentNode = readEle[readEle.length - 1].parentNode.nextSibling.nextSibling.nextSibling.firstChild;
            } else {
                currentNode = readEle[readEle.length - 1];
            }

            currentNode.classList.toggle('highlight');
            if(/strike/i.test(currentNode.classList.toString())) {
                currentNode.classList.remove('strike');
            }
            sWaveId = 's' + currentNode.id;
            hWaveId = 'h' + currentNode.id;

            if(hWaveId in wavesurfer.regions.list) {
                wavesurfer.regions.list[hWaveId].remove();
            } else {
                if(sWaveId in wavesurfer.regions.list) {
                    wavesurfer.regions.list[sWaveId].remove();
                }
                wavesurfer.addRegion({
                    id: hWaveId,
                    start: currentNode.getAttribute('starttime'),
                    end: currentNode.getAttribute('endtime'),
                    color: 'rgba(255, 255, 0, 0.3)',
                    drag: false,
                    resize: false
                });
            }

            var r_i = currentNode.getAttribute('resultindex');
            var a_i = currentNode.getAttribute('alternativeindex');
            var w_i = currentNode.getAttribute('wordindex');

            if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3]) {
                if(transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight) {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = false;
                } else {
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = true;
                    transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
                }
            } else {
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3] = {};
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].highlight = true;
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][3].strike = false;
            }
        }

        getStrikes();
        if(playHighlights) {
            getHighlights();
        }
    },

    'undo': function() {
        var currAction;
        if(pastStack.length > 0) {
            futureStack.push(JSON.stringify(transcript));
            currAction = pastStack.pop()
            transcript = {};
            transcript = JSON.parse(currAction);
            fillWords();
        }
    },

    'redo': function() {
        var currAction;
        if(futureStack.length > 0) {
            pastStack.push(JSON.stringify(transcript));
            currAction = futureStack.pop()
            transcript = JSON.parse(currAction);
            fillWords();
        }
    }
}

// set cookies for showing / hiding of hints
function setCookie(key, value) {
    var d = new Date();
    d.setTime(d.getTime() + 2592000000);
    document.cookie = key + '=' + value + '; expires=' + d.toUTCString() + '; path=/';
}

// convert seconds to  string of format HH:MM:ss,mmm
function toHHMMssmmm(seconds) {
    var milliseconds = parseInt(seconds * 1000, 10);
    var hr = Math.floor(milliseconds / 3600000);
    milliseconds %= 3600000;
    var min = Math.floor(milliseconds / 60000);
    milliseconds %= 60000;
    var sec = Math.floor(milliseconds / 1000);
    milliseconds %= 1000;
    if( hr < 10 ) { hr = '0' + hr; }
    if( min < 10 ) { min = '0' + min; }
    if( sec < 10 ) { sec = '0' + sec; }
    if( milliseconds < 100 ) {
        if( milliseconds < 10 ) {
            milliseconds = '00' + milliseconds;
        } else {
            milliseconds = '0' + milliseconds;
        }
    }
    return hr + ':' + min + ':' + sec + ',' + milliseconds;
}

// change play pause icon
function togglePlayPause() {
    document.getElementById('playpause').classList.toggle('fa-play');
    document.getElementById('playpause').classList.toggle('fa-pause');
}

// add color to active playback speed
function activeSpeed() {
    var map = {
        0.5: 0,
        1: 1,
        1.25: 2,
        1.5: 3,
        1.75: 4,
        2: 5
    }
    var speedButtons = document.querySelectorAll('.speed');
    [].forEach.call(speedButtons, function(el) {
        el.classList.remove('activespeed');
    });
    speedButtons[map[wavesurfer.backend.playbackRate]].classList.add('activespeed');
}

// load JSON files from url
function loadJSON(filepath, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            callback(this.responseText);
        }
    }
    xhttp.open('GET', filepath, true);
    xhttp.send();
}

// save transcript
function saveJSON(alertUser) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            if(alertUser) {
                alert(JSON.parse(this.responseText).message);
            }
        } else if(this.readyState === 4 && this.status != 200) {
            alert('Could not save changes, please check your internet connection or try again later.');
        }
    }
    xhttp.open('POST', './save.php', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('transcript=' + JSON.stringify(transcript) + '&transcripturl=' + pageOptions.transcriptURL);
}

// generate highlight array
function getHighlights() {
    var keys = Array();

    // get highlighted starts and ends
    [].forEach.call(document.getElementsByClassName('highlight'), function(el) {
        keys.push({
            start: Number(el.getAttribute('starttime')),
            end: Number(el.getAttribute('endtime'))
        });
    });

    // clear array to remove garbage data
    highlights = {};

    // generate highlight array
    if(keys.length > 0) {
        highlights['0'] = Number((keys[0].start).toFixed(1));
        for(var i = 0; i < keys.length - 1; i++) {
            if(Number(keys[i + 1].start.toFixed(1)) > Number(keys[i].end + 0.2).toFixed(1)) {
                // give a 0.5 second window to compare and skip
                highlights[(keys[i].end - 0.2).toFixed(1)] = Number(keys[i + 1].start.toFixed(1));
                highlights[(keys[i].end - 0.1).toFixed(1)] = Number(keys[i + 1].start.toFixed(1));
                highlights[(keys[i].end).toFixed(1)] = Number(keys[i + 1].start.toFixed(1));
                highlights[(keys[i].end + 0.1).toFixed(1)] = Number(keys[i + 1].start.toFixed(1));
                highlights[(keys[i].end + 0.2).toFixed(1)] = Number(keys[i + 1].start.toFixed(1));
            }
        }
        if(keys.length > 1) {
            highlights[(keys[i].end - 0.2).toFixed(1)] = highlights['0'];
            highlights[(keys[i].end - 0.1).toFixed(1)] = highlights['0'];
            highlights[keys[i].end.toFixed(1)] = highlights['0'];
            highlights[(keys[i].end + 0.1).toFixed(1)] = highlights['0'];
            highlights[(keys[i].end + 0.2).toFixed(1)] = highlights['0'];
        }
    }
}

// get strikes array
function getStrikes() {
    var keys = Array();

    // get striked starts and ends
    [].forEach.call(document.getElementsByClassName('strike'), function(el) {
        keys.push({
            start: Number(el.getAttribute('starttime')),
            end: Number(el.getAttribute('endtime'))
        });
    });

    // clear array to remove garbage
    strikes = {};

    // generate array
    var start, end;
    for(var i = 0; i < keys.length; i++) {
        start = keys[i].start.toFixed(1);
        while(i < keys.length - 1 && keys[i].end.toFixed(1) === keys[i + 1].start.toFixed(1)) { i++; }
        end = Number(keys[i].end.toFixed(1));
        if(end > (Number(start) + 0.2)) {
            // 0.5 second window
            strikes[(Number(start) - 0.2).toFixed(1)] = end;
            strikes[(Number(start) - 0.1).toFixed(1)] = end;
            strikes[start] = end;
            strikes[(Number(start) + 0.1).toFixed(1)] = end;
            strikes[(Number(start) + 0.2).toFixed(1)] = end;
        }
    }
}

// show find replace dialog
function showFindReplace(event) {
    var ele = document.getElementById('find-replace-wrapper');
    ele.setAttribute('style', 'top: ' + event.clientY + 'px; left: ' + event.clientX + 'px;');
    ele.classList.remove('hidden');
    setTimeout(function() {
        ele.classList.remove('invisible');
    }, 50);
}

// show export dialog
function showExport(event) {
    var ele = document.getElementById('export-wrapper');
    ele.setAttribute('style', 'top: ' + event.clientY + 'px; left: ' + event.clientX + 'px;');
    ele.classList.remove('hidden');
    setTimeout(function() {
        ele.classList.remove('invisible');
    }, 50);
}

// show help dialog
function showHelp(event) {
    var ele = document.getElementById('help-wrapper');
    ele.classList.remove('hidden');
    setTimeout(function() {
        ele.classList.remove('invisible');
    }, 50);
}

// show UI (disable loading mask)
function enableUI() {
    document.getElementById('loader').classList.toggle('spinning');
    document.getElementById('main-container-mask').classList.toggle('invisible');
    setTimeout(function() {
        document.getElementById('main-container-mask').setAttribute('style', 'display: none');
    }, 30);
}

// seek audio to word
function seekToWord(caller) {
    wavesurfer.seekTo(caller.id / wavesurfer.getDuration());
}

// resize container if body size is changed
function resizeBody() {
    wavesurfer.drawBuffer();
    wavesurfer.drawer.progress(wavesurfer.backend.getPlayedPercents());
    var off = document.getElementsByClassName('main-container')[0].offsetHeight;
    var height = window.innerHeight - off;
    document.getElementsByClassName('transcript-container')[0].setAttribute('style', 'height: ' + height + 'px');
    document.getElementById('text-options').setAttribute('style', 'margin-top: ' + off + 'px');
}

// fill editor with words from transcript
function fillWords() {
    var results = transcript.results[0].results;
    var speakers = transcript.results[0].speaker_labels;
    var words = Array();
    var toReach = Array();
    var maxAlternativeIndex;
    var i = 0;
    var globalspkr_i = 0;
    var startingWordCounter = 0;

    var textArea = document.getElementById('transcript-area');
    var datalist = document.getElementById('speakerlist');

    // clear the div before adding content (helpful when undo / redo refreshes content)
    while(textArea.hasChildNodes()) {
        textArea.removeChild(textArea.lastChild);
    }

    // retain the speaker datalist
    textArea.appendChild(datalist);

    // for each result
    results.forEach(function(result, resultIndex) {
        var maxConfidence = 0;
        var maxAlternative;

        // find chunk with maximum confidence
        result.alternatives.forEach(function(alternative, alternativeIndex) {
            if(alternative.confidence > maxConfidence) {
                maxAlternative = alternative;
                maxAlternativeIndex = alternativeIndex;
            }
        });

        // for each word in the chunk
        var currentSpeaker, prevSpeaker, div, speakerName, currWord;
        maxAlternative.timestamps.forEach(function(word, wordIndex) {

            currentSpeaker = speakers[i++].speaker;

            if(currentSpeaker != prevSpeaker) {
                // if speaker changes within a chunk
                if(div) {
                    textArea.appendChild(div);
                    var specialBreak = document.createElement('br');
                    specialBreak.classList.add('special-break');
                    textArea.appendChild(specialBreak);
                }

                // start creating div for surrent speaker
                div = document.createElement('div');
                div.setAttribute('title', currentSpeaker);
                div.setAttribute('contenteditable', 'true');
                div.classList.add('speaker-div');

                // input field for speaker name
                speakerName = document.createElement('input');
                speakerName.value = currentSpeaker;
                speakerName.classList.add('speaker');
                speakerName.setAttribute('list', 'speakerlist');
                speakerName.setAttribute('speakername', currentSpeaker);
                speakerName.setAttribute('speakerindex', (i - 1));
                speakerName.setAttribute('style', 'width: ' + ((speakerName.value.length * 8) + 20) + 'px');
                speakerName.setAttribute('onkeyup', 'resizeInput(this);');
                speakerName.setAttribute('onclick', 'handleList(this)');
                speakerName.setAttribute('onblur', 'handleValue(this)');
                speakerName.setAttribute('onchange', 'changeInput(this);');
                textArea.appendChild(speakerName);
            }

            // start creating span for current word if word is not blank
            if(word[0].trim() != '') {
                currWord = document.createElement('span');
                currWord.innerHTML = (startingWordCounter==0) ? capitalizeFirstLetter(word[0]) : word[0];
                currWord.setAttribute('starttime', word[1]);
                currWord.setAttribute('endtime', word[2]);
                currWord.setAttribute('oldval', word[0]);
                currWord.setAttribute('resultindex', resultIndex);
                currWord.setAttribute('alternativeindex', maxAlternativeIndex);
                currWord.setAttribute('wordindex', wordIndex);
                currWord.setAttribute('speakerindex', globalspkr_i);
                currWord.setAttribute('title', word[1] + " - " + word[2]);
                currWord.setAttribute('tabindex', '-1');
                currWord.addEventListener('focus', function() { seekToWord(this); });
                currWord.id = word[1];
                currWord.classList.add('word');
                
                // check if word highlighted or striked
                var hWaveId = 'h' + word[1];
                var sWaveId = 's' + word[1];
                if(word[3]) {
                    if(word[3].highlight) {
                        // add highlighting to text
                        currWord.classList.add('highlight');

                        // check if highlighted region already present in waveform (helpful on undo / redo)
                        if(!(hWaveId in wavesurfer.regions.list)) {
                            // create highlighted region
                            wavesurfer.addRegion({
                                id: hWaveId,
                                start: currWord.getAttribute('starttime'),
                                end: currWord.getAttribute('endtime'),
                                color: 'rgba(255, 255, 0, 0.3)',
                                drag: false,
                                resize: false
                            });
                        }
                    } else if(word[3].strike) {
                        // add strike to text
                        currWord.classList.add('strike');

                        // check if striked region already present in waveform (helpful on undo / redo)
                        if(!(sWaveId in wavesurfer.regions.list)) {
                            // create striked region
                            wavesurfer.addRegion({
                                id: sWaveId,
                                start: currWord.getAttribute('starttime'),
                                end: currWord.getAttribute('endtime'),
                                color: 'rgba(100, 100, 100, 0.5)',
                                drag: false,
                                resize: false
                            });
                        }
                    } else {
                        // remove highlight if present
                        if(hWaveId in wavesurfer.regions.list) {
                            wavesurfer.regions.list[hWaveId].remove();
                        }
                        // remove strike region if present
                        if(sWaveId in wavesurfer.regions.list) {
                            wavesurfer.regions.list[sWaveId].remove();
                        }
                    }
                } else {
                    // remove highlight if present
                    if(hWaveId in wavesurfer.regions.list) {
                        wavesurfer.regions.list[hWaveId].remove();
                    }
                    // remove strike region if present
                    if(sWaveId in wavesurfer.regions.list) {
                        wavesurfer.regions.list[sWaveId].remove();
                    }
                }

                // add current word to speaker
                div.appendChild(currWord);
                ++startingWordCounter;
            }
            globalspkr_i++;

            // go to next speaker
            prevSpeaker = currentSpeaker;
        });
        startingWordCounter = 0;

        // add speaker to editor
        textArea.appendChild(div);

        // add small space between two speakers
        var specialBreak = document.createElement('br');
        specialBreak.classList.add('special-break');
        textArea.appendChild(specialBreak);
    });

    // add observer for each word
    [].forEach.call(document.querySelectorAll('.word'), function(el) {
        wordObserver.observe(el, {characterData: true, subtree: true});
        wordChildObserver.observe(el, {childList: true});
    });

    // add oobserver for removed nodes
    [].forEach.call(document.querySelectorAll('.speaker-div'), function(el) {
        nodeObserver.observe(el, {childList: true});
    });

    // get highlights and strike arrays for skipping playback
    getHighlights();
    getStrikes();
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// when a word is changed
function wordMutation(mutation) {
    mutation.forEach(function(m) {
        var word = m.target.parentElement;

        // get position of current word in transcript json
        var r_i = word.getAttribute('resultindex');
        var a_i = word.getAttribute('alternativeindex');
        var w_i = word.getAttribute('wordindex');

        // check if value has changed
        if( word.innerText != transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][0] ) {
            // push current content to undo stack
            pastStack.push(JSON.stringify(transcript));

            // add new value to chunk
            var newValue = word.innerText;
            transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][0] = newValue;

            // generate new chunk content
            var newTranscript = '';
            transcript.results[0].results[r_i].alternatives[a_i].timestamps.forEach(function(word) {
                newTranscript += word[0];
            });
            transcript.results[0].results[r_i].alternatives[a_i].transcript = newTranscript;

            // approximate timestamps
            var endTime, startTime;
            // if this is first word of speaker
            if(this === word.parentElement.firstChild) {
                // if first word in transcript
                if(r_i === '0') {
                    startTime = '0';
                } else if(w_i === '0') {
                    // start time of current changed to end of previous chunk
                    var pre_r_i = Number(r_i) - 1;
                    var pre_index = transcript.results[0].results[pre_r_i].alternatives[0].timestamps.length - 1;
                    startTime = transcript.results[0].results[pre_r_i].alternatives[0].timestamps[pre_index][2];
                } else {
                    var pre_index = Number(w_i) - 1;
                    startTime = transcript.results[0].results[r_i].alternatives[0].timestamps[pre_index][2];
                }
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][1] = startTime;
                word.setAttribute('starttime', startTime);
                word.id = startTime;
                word.setAttribute('title', startTime + ' - ' + word.getAttribute('endtime'));
            } else if(word.nextSibling) {
                endTime = word.nextSibling.getAttribute('starttime');
                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][2] = endTime;
                word.setAttribute('endtime', endTime);
                word.setAttribute('title', word.getAttribute('starttime') + ' - ' + endTime);
            }
            // not approximating the time if the word is last in the current chunk

            // adjust to new timestamps
            if(/highlight/i.test(word.classList.value)) {
                GLOBAL_ACTIONS['highlight']();
                GLOBAL_ACTIONS['highlight']();
            }
            if(/strike/i.test(word.classList.value)) {
                GLOBAL_ACTIONS['strike']();
                GLOBAL_ACTIONS['strike']();
            }
        }
    });
}

// when enter is pressed in firefox
function wordChildMutation(mutation) {
    pastStack.push(JSON.stringify(transcript));

    if(mutation[0].addedNodes.length > 0) {
        // stop mutations
        wordObserver.disconnect();
        nodeObserver.disconnect();
        wordChildObserver.disconnect();

        currWord = mutation[mutation.length - 1].target;
        var nodes = Array();
        while(currWord) {
            nodes.push(currWord);
            transcript.results[0].speaker_labels[currWord.getAttribute('speakerindex')].speaker = 'Unknown Speaker';
            currWord = currWord.nextSibling;
        }

        var refNode = nodes[0].parentNode.nextSibling;
        nodes[0].innerText = nodes[0].getAttribute('oldval');
        var parent = document.getElementById('transcript-area');
        var specialBreak = document.createElement('br');
        specialBreak.classList.add('special-break');

        // start creating div for current speaker
        div = document.createElement('div');
        div.setAttribute('title', 'Unknown Speaker');
        div.setAttribute('contenteditable', 'true');
        div.classList.add('speaker-div');

        // input field for speaker name
        speakerName = document.createElement('input');
        speakerName.value = 'Unknown Speaker';
        speakerName.classList.add('speaker');
        speakerName.setAttribute('list', 'speakerlist');
        speakerName.setAttribute('speakerindex', nodes[0].getAttribute('speakerindex'));
        speakerName.setAttribute('speakername', 'Unknown Speaker');
        speakerName.setAttribute('style', 'width: ' + ((speakerName.value.length * 8) + 20) + 'px');
        speakerName.setAttribute('onkeyup', 'resizeInput(this);');
        speakerName.setAttribute('onclick', 'handleList(this)');
        speakerName.setAttribute('onblur', 'handleValue(this)');
        speakerName.setAttribute('onchange', 'changeInput(this);');

        // add words to div
        nodes.forEach(function(node) {
            div.appendChild(node);
        });

        // insert before next speaker
        parent.insertBefore(specialBreak, refNode);
        parent.insertBefore(speakerName, refNode);
        parent.insertBefore(div, refNode);

        // add observer for each word
        [].forEach.call(document.querySelectorAll('.word'), function(el) {
            wordObserver.observe(el, {characterData: true, subtree: true});
            wordChildObserver.observe(el, {childList: true});
        });
    } else {
        mutation.forEach(function(m) {
            m.removedNodes.forEach(function(node) {
                // get position of current word in transcript json
                var r_i = node.getAttribute('resultindex');
                var a_i = node.getAttribute('alternativeindex');
                var w_i = node.getAttribute('wordindex');

                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][0] = '';
            });
        });
    }
}

// when enter is pressed in other browsers
function nodeMutation(mutation) {
    pastStack.push(JSON.stringify(transcript));
    if(mutation[0].addedNodes.length > 0) {

        // stop other mutations
        wordObserver.disconnect();
        wordChildObserver.disconnect();
        nodeObserver.disconnect();

        var nodes = Array();
        mutation.forEach(function(m) {
            m.removedNodes.forEach(function(node) {
                if(node.innerText.trim() != '') {
                    nodes.push(node);
                    index = node.getAttribute('speakerindex');
                    transcript.results[0].speaker_labels[index].speaker = 'Unknown Speaker';
                }
            });
        });

        var refNode = nodes[0].parentNode.parentNode.nextSibling;
        var parent = document.getElementById('transcript-area');
        var specialBreak = document.createElement('br');
        specialBreak.classList.add('special-break');

        // start creating div for current speaker
        div = document.createElement('div');
        div.setAttribute('title', 'Unknown Speaker');
        div.setAttribute('contenteditable', 'true');
        div.classList.add('speaker-div');

        // input field for speaker name
        speakerName = document.createElement('input');
        speakerName.value = 'Unknown Speaker';
        speakerName.classList.add('speaker');
        speakerName.setAttribute('list', 'speakerlist');
        speakerName.setAttribute('name', 'speaker');
        speakerName.setAttribute('speakername', 'Unknown Speaker');
        speakerName.setAttribute('speakerindex', nodes[0].getAttribute('speakerindex'));
        speakerName.setAttribute('style', 'width: ' + ((speakerName.value.length * 8) + 20) + 'px');
        speakerName.setAttribute('onkeyup', 'resizeInput(this);');
        speakerName.setAttribute('onclick', 'handleList(this)');
        speakerName.setAttribute('onblur', 'handleValue(this)');
        speakerName.setAttribute('onchange', 'changeInput(this);');

        // add words to div
        nodes.forEach(function(node) {
            div.appendChild(node);
        });

        // insert before next speaker
        parent.insertBefore(specialBreak, refNode);
        parent.insertBefore(speakerName, refNode);
        parent.insertBefore(div, refNode);

        oldDiv = mutation[0].target;
        oldDiv.removeChild(oldDiv.lastChild);
        if(!nodes[0].id) {
            nodes[0].id = oldDiv.lastChild.id;
            nodes[0].innerText = nodes[0].getAttribute('oldval');
            oldDiv.removeChild(oldDiv.lastChild);
        }

        // add observer for each word
        [].forEach.call(document.querySelectorAll('.word'), function(el) {
            wordObserver.observe(el, {characterData: true, subtree: true});
        });

        // add observer for nodes
        [].forEach.call(document.querySelectorAll('.speaker-div'), function(el) {
            nodeObserver.observe(el, {childList: true});
        });
    } else { // if node deleted
        mutation.forEach(function(m) {
            m.removedNodes.forEach(function(node) {
                // get position of current word in transcript json
                var r_i = node.getAttribute('resultindex');
                var a_i = node.getAttribute('alternativeindex');
                var w_i = node.getAttribute('wordindex');

                transcript.results[0].results[r_i].alternatives[a_i].timestamps[w_i][0] = '';
            });
        });
    }
}

// mark words as read
function readWords() {
    readWord = document.getElementsByClassName('read');
    
    try {
        currWord = readWord[0] ? (readWord[readWord.length - 1].nextSibling ? readWord[readWord.length - 1].nextSibling : readWord[readWord.length - 1].parentElement.nextSibling.nextSibling.nextSibling.firstChild) : document.getElementsByClassName('word')[0];
    } catch (exception) {
        var allWords = document.getElementsByClassName('word');
        currWord = allWords[allWords.length - 1];
    }

    var divEnds = document.getElementById('transcript-area').getBoundingClientRect();

    if (currWord)
        if(currWord.id < wavesurfer.getCurrentTime()) {
            while(currWord && currWord.id < wavesurfer.getCurrentTime()) {
                currWord.classList.add('read');
                //currWord = currWord.nextSibling ? currWord.nextSibling : currWord.parentElement.nextSibling.nextSibling.nextSibling.firstChild;
                if(currWord.nextSibling) {
                    currWord = currWord.nextSibling;
                } else {
                    if(currWord.parentElement.nextSibling.nextSibling) {
                        currWord = currWord.parentElement.nextSibling.nextSibling.nextSibling.firstChild;
                    } else {
                        var allWords = document.getElementsByClassName('word');
                        currWord = allWords[allWords.length - 1];
                        break;
                    }
                }
            }
            if(divEnds.top + 150 < currWord.getBoundingClientRect().top) {
                var scrollStep = function() {
                    if(divEnds.top + 150 >= currWord.getBoundingClientRect().top) {
                        clearInterval(goDown);
                    } else {
                        document.getElementById('transcript-area').scrollTop += 5;
                    }
                }
                var goDown = setInterval(scrollStep, 10);
            }
            if(divEnds.bottom < currWord.getBoundingClientRect().bottom || divEnds.top > currWord.getBoundingClientRect().top) {
                //currWord.scrollIntoView();
                document.getElementById('transcript-area').scrollTop = currWord.offsetTop - 500;
            }
        } else {
            [].forEach.call(document.querySelectorAll('.read'), function(el) {
                if(el.id > wavesurfer.getCurrentTime()) {
                    el.classList.remove('read');
                }
            });

            readWord = document.getElementsByClassName('read');
            currWord = readWord[readWord.length - 1];
            if(currWord) {
                if(divEnds.bottom < currWord.getBoundingClientRect().bottom || divEnds.top > currWord.getBoundingClientRect().top) {
                    //currWord.scrollIntoView();
                    document.getElementById('transcript-area').scrollTop = currWord.offsetTop - 500;
                }
                if(divEnds.top + 100 > currWord.getBoundingClientRect().top) {
                    var scrollStep = function() {
                        if (currWord)
                            if(divEnds.top + 100 <= currWord.getBoundingClientRect().top) {
                                clearInterval(goUp);
                            } else {
                                document.getElementById('transcript-area').scrollTop -= 5;
                            }
                    }
                    var goUp = setInterval(scrollStep, 10);
                }
            }
        }
}

// change speaker label
function changeInput(caller) {
    pastStack.push(JSON.stringify(transcript));
    if(!caller.value.trim() || isNaN(caller.getAttribute('speakername'))) {
        if(!caller.value.trim()) {
            caller.value = 'Unknown Speaker';
        }
        caller.setAttribute('speakername', caller.value);
        var startIndex = caller.getAttribute('speakerindex');
        var endIndex = caller.nextSibling.nextSibling.nextSibling ? Number(caller.nextSibling.nextSibling.nextSibling.getAttribute('speakerindex')) : transcript.results[0].speaker_labels.length;

        for(var i = startIndex; i < endIndex; i++) {
            transcript.results[0].speaker_labels[i].speaker = caller.value;
        }
    } else {
        var input = caller.value;
        var oldName = caller.getAttribute('speakername');
        var inputLength = (caller.value.length * 8) + 20;
        transcript.results[0].speaker_labels.forEach(function(el) {
            if(el.speaker == oldName) {
                el.speaker = input;
            }
        });
        [].forEach.call(document.querySelectorAll('.speaker'), function(el) {
            if(el.getAttribute('speakername') === oldName) {
                el.value = input;
                el.setAttribute('speakername', input);
                resizeInput(el);
            }
        });
    }

    if(!/Unknown Speaker/.test(caller.value)) {
        var speakerList = document.getElementById('speakerlist');
        var hasInput = false;
        [].forEach.call(speakerList.childNodes, function(el) {
            if(el.value == caller.value) {
                hasInput = true;
            }
        });
        if(!hasInput) {
            datalistOption = document.createElement('option');
            datalistOption.value = caller.value;
            speakerList.appendChild(datalistOption);
        }
    }
}

// change value of speaker to blank on click to show drop down
function handleList(caller) {
    caller.value = '';
}

// change value back to normal if no change happens
function handleValue(caller) {
    caller.value = caller.getAttribute('speakername');
    resizeInput(caller);
}

// resize input size as name changes
function resizeInput(caller) {
    caller.setAttribute('style', 'width: ' + ((caller.value.length * 8) + 20) + 'px');
}

// seek to deep link if GET variable 't' is set [&t=xxhxxmxxs]
function checkDeepLink(getVars) {
    if('t' in getVars) {
        var time = 0;
        getVars.t = getVars.t.toLowerCase();
        if(getVars.t.split('h').length > 1) {
            time += Number(getVars.t.split('h')[0]) * 3600;
            getVars.t = getVars.t.split('h')[1];
        }
        if(getVars.t.split('m').length > 1) {
            time += Number(getVars.t.split('m')[0]) * 60;
            getVars.t = getVars.t.split('m')[1];
        }
        if(getVars.t.split('s').length > 1) {
            time += Number(getVars.t.split('s')[0]);
            getVars.t = getVars.t.split('s')[1];
        }
        var ratio = time / wavesurfer.getDuration();
        if(ratio <= 1) {
            wavesurfer.seekTo(ratio);
        }
    }
}

// extract GET parameters from URL
function getParameters() {
    var getVars = {};
    window.location.search.slice(1).split('&').forEach(function(getVar) {
        var temp = getVar.split('=');
        getVars[temp[0]] = temp[1];
    });
    return getVars;
}

// get URL of data from database using id from GET parameter
function getURLs(id) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            pageOptions = JSON.parse(this.responseText);

            if(pageOptions.metaURL && pageOptions.transcriptURL && pageOptions.audioURL) {
                init();
            } else {
                alert('The URL is not correct. Please go back to your Call Recordings and start again.');
            }
        } else if(this.readyState === 4 && this.status != 200) {
            alert('Server response invalid. Please try later.');
            // window.parent.location = base_url + "user/call_log";
        }
    }
    xhttp.open('POST', './save.php', true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('id=' + id);
}

// update elapsed time and remaining time
function updateTime() {
    var currTime = wavesurfer.getCurrentTime();
    var totalTime = wavesurfer.getDuration();
    var currDisplayTime = toHHMMssmmm(currTime).split(',')[0];
    var remDisplayTime = toHHMMssmmm(totalTime - currTime).split(',')[0];
    document.getElementById('elapsed-time').innerText = currDisplayTime;
    document.getElementById('remaining-time').innerText = remDisplayTime;
}


function init() {
    // if user tries to close the browser
    window.onbeforeunload = function(e) {
        // saveJSON(true);
    }

    // cookies
    if(/hints=off/i.test(document.cookie)) {
        GLOBAL_ACTIONS['toggle-hints']();
    }
    if(/help=off/i.test(document.cookie)) {
        GLOBAL_ACTIONS['toggle-help']();
        GLOBAL_ACTIONS['close-help']();
    }

    // wavesurfer options
    var options = {
        container: document.querySelector('#audioclip'),
        progressColor: '#f4364c',
        waveColor: '#3f88c5',
        cursorWidth: 2,
        cursorColor: '#3f88c5',
        barWidth: 2,
        normalize: true,
        backend: 'MediaElement',
        hideScrollbar: false,
        height: 95
    };

    // initialize wavesurfer with options
    wavesurfer.init(options);

    // load metadata and audio
    loadJSON(pageOptions.metaURL, function(text) {
        metadata = JSON.parse(text);
        silences = metadata.silences;
        
        wavesurfer.loadCount = 1;
        wavesurfer.load(pageOptions.audioURL, metadata.peaks, 'none');
    });

    
    wavesurfer.on('loading', function(progress,callback) {

        document.getElementById('loading-percent').innerText = "Loaded " + progress + "%";

    });

    // handle events while playing
    wavesurfer.on('audioprocess', function() {
        
        curr = wavesurfer.getCurrentTime().toFixed(1);
        readWords();
        updateTime();

        if( curr in strikes ) {
            wavesurfer.backend.seekTo(strikes[curr]);
        }

        if(playHighlights) {
            if( curr in highlights ) {
                wavesurfer.backend.seekTo(highlights[curr]);
            }
        }

        if(skipSilences) {
            if( curr in silences ) {
                wavesurfer.backend.seekTo(silences[curr]);
            }
        }
    });

    wavesurfer.on('finish', function() {
        GLOBAL_ACTIONS['stop']();
    });

    // read words and update time when seek occurs
    wavesurfer.on('seek', function() {
        readWords();
        updateTime();
    });

    // startup the page
    wavesurfer.on('ready', function() {
        
        waveFormReady();
        
    });

    function waveFormReady() {
        
        var timeline = Object.create(WaveSurfer.Timeline);
        var timeGap = (Math.floor(wavesurfer.getDuration() / 1000) * 100) / 2;
        timeline.init({
            wavesurfer: wavesurfer,
            container: '#audioclip-timeline',
            primaryColor: '#3f88c5',
            seondaryColor: '#f4364c',
            primaryFontColor: '#f6f7eb',
            secondaryFontColor: '#f6f7eb',
            timeInterval: timeGap,
            height: 15
        });

        // updateTime();

        wavesurfer.addRegion({
            id: 'dummy',
            start: 0,
            end: 0,
            drag: false,
            resize: false,
            color: 'rgba(255, 255, 0, 0)'
        });

        resizeBody();
        enableUI();

        activeSpeed();

        nodeObserver = new MutationObserver(function(mutation) {
            nodeMutation(mutation);
        });
        wordObserver = new MutationObserver(function(mutation) {
            wordMutation(mutation);
        });
        wordChildObserver = new MutationObserver(function(mutation) {
            wordChildMutation(mutation);
        });

        loadJSON(pageOptions.transcriptURL, function(text) {
            transcript = JSON.parse(text);
            pastStack.push(JSON.stringify(transcript));
            fillWords();
            checkDeepLink(getParams);
            // fill speaker name options at load
            var speakerList = document.getElementById('speakerlist');
            var speakerArray = [];
            [].forEach.call(document.querySelectorAll('.speaker'), function(el) {
                if(isNaN(el.value) && !/Unknown Speaker/i.test(el.value)) {
                    if(speakerArray.indexOf(el.value) <= -1) {
                        speakerArray = speakerArray.concat(el.value);
                    }
                }
            });
            speakerArray.forEach(function(speaker) {
                var dataOption = document.createElement('option');
                dataOption.value = speaker;
                speakerList.appendChild(dataOption);
            });
        });

        setInterval(function() {
            saveJSON(false);
        }, 60000)
    }


    // Event handlers
    // buttons
    [].forEach.call(document.querySelectorAll('[data-action]'), function(el) {
        el.addEventListener('click', function(e) {
            var action = e.currentTarget.dataset.action;
            if(action in GLOBAL_ACTIONS) {
                e.preventDefault();
                GLOBAL_ACTIONS[action]();
            }
        });
    });

    // volume
    document.getElementById('volumerange').addEventListener('change', function() {
        wavesurfer.setVolume(this.value / 100);
    });

    // keypresses
    var shortcutWrapper = document.getElementById('shortcut-wrapper');
    var shift_key = document.getElementById('shift-key');
    var space_key = document.getElementById('space-key');
    var extra_key = document.getElementById('extra-key');
    document.addEventListener('keydown', function(e) {
        var map = {
            32: 'play',         // space
            82: 'rewind',       // R
            72: 'highlight',    // H
            74: 'strike',       // J
            90: 'undo',         // Z
            83: 'save',         // S
        }
        if(e.ctrlKey) {
            shortcutWrapper.classList.remove('hidden');
            if(e.shiftKey) {
                shift_key.classList.remove('hidden');
            }
            var action = map[e.keyCode];
            if(action in GLOBAL_ACTIONS) {
                e.preventDefault();
                if(e.shiftKey && action == 'undo') {
                    extra_key.innerHTML = 'Z';
                    extra_key.classList.remove('hidden');
                    GLOBAL_ACTIONS['redo']();
                } else {
                    if(e.keyCode == 32) {
                        space_key.classList.remove('hidden');
                    } else {
                        extra_key.innerHTML = e.key.toUpperCase();
                        extra_key.classList.remove('hidden');
                    }
                    GLOBAL_ACTIONS[action]();
                }
            }
        }
    });

    // hide hints on key up
    document.addEventListener('keyup', function(e) {
        if(!/hidden/i.test(shortcutWrapper.classList.toString())) {
            shortcutWrapper.classList.add('hidden');
        }
        if(!/hidden/i.test(shift_key.classList.toString())) {
            shift_key.classList.add('hidden');
        }
        if(!/hidden/i.test(extra_key.classList.toString())) {
            extra_key.classList.add('hidden');
        }
        if(!/hidden/i.test(space_key.classList.toString())) {
            space_key.classList.add('hidden');
        }
    })

    // find matches
    document.getElementById('find').addEventListener('keyup', function() {
        var input = this.value;
        [].forEach.call(document.querySelectorAll('.word'), function(el) {
            if(el.innerText.search(input) >= 0) {
                if(!/found/i.test(el.classList.toString())) {
                    el.classList.add('found');
                }
            } else {
                if(/found/i.test(el.classList.toString())) {
                    el.classList.remove('found');
                }
            }
        });
    });

    // replace
    document.getElementById('find-replace-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var foundWord = document.getElementById('find').value;
        var replaceWord = document.getElementById('replace').value;
        var counter = 0;
        [].forEach.call(document.querySelectorAll('.found'), function(el) {
            if(el.innerText.search(foundWord) >= 0) {
                el.innerText = el.innerText.replace(foundWord, replaceWord);
                counter++;
            }
        });
        document.getElementById('find-replace-wrapper').classList.add('hidden');
        setTimeout(function() {
            [].forEach.call(document.querySelectorAll('.found'), function(el) {
                el.classList.remove('found');
            });
        }, 1000);
        setTimeout(function() {
            alert('Replaced ' + counter + ' occurrences of \'' + foundWord + '\' with \'' + replaceWord + '\'.');
        }, 100);
    });

    document.getElementById('audioclip').addEventListener('mousemove', function(e) {
        var tooltip = document.getElementById('tooltip');
        tooltip.style.top = e.clientY + 'px';
        tooltip.style.left = e.clientX + 'px';
        tooltip.innerText = toHHMMssmmm((e.layerX / wavesurfer.drawer.width) * wavesurfer.getDuration()).split(',')[0];
        tooltip.style.display = 'block';
    });

    document.getElementById('audioclip').addEventListener('mouseleave', function() {
        document.getElementById('tooltip').style.display = 'none';
    });

    // to highlight using waveform
    var range;
    // highlight start
    document.getElementById('audioclip').addEventListener('mousedown', function(e) {
        setTimeout(function() {
            var startEle = document.getElementsByClassName('read');
            range = document.createRange();
            try {
                range.setStart(startEle[startEle.length - 1], 0);
            } catch (exception) {}
        }, 100);
    });

    // highlight end
    document.getElementById('audioclip').addEventListener('mouseup', function(e) {
        setTimeout(function() {
            var endEle = document.getElementsByClassName('read');
            if (endEle.length>0) {
                range.setEnd(endEle[endEle.length - 1], 0);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 100);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    getParams = getParameters();
    // if id present in GET request
    if('id' in getParams) {
        getURLs(getParams['id']);
    } else { // only for testing
        pageOptions = {
            metaURL: 'transcript/new-york-rock_meta.json',
            transcriptURL: 'transcript/new-york-rock_prepared.json',
            audioURL: 'audio/new-york-rock.mp3'
        };
        init();
    }
});
