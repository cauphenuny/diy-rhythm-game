import {
    keys, all_keys, note_name, sharp_name, flat_name,
    sharp_note, sharp_scale_name, flat_note, flat_scale_name,
    diff, velocity_levels, velocity_adj, key2note, C1, C2, C3,
    init_constants,
} from './constants.js'
import { env, play, notepress, notedown, noteup, notestop, piano, stop } from './player.js'
import { keyup_animation, keydown_animation, mouseenter, mouseleave } from './keyboard.js'

let loading = 1;

function refresh() {
    document.getElementById("bpm").value = env.bpm;
    document.getElementById("vel").textContent = "力度：" + velocity_levels[env.velocity];
    const selectElement = document.getElementById('offset_option');
    selectElement.selectedIndex = env.offset_option;
    if (env.offset_option == 0) {
        document.getElementById("key_name").innerHTML = "(1=" + note_name[(env.global_offset + 120) % 12] + ")";
        document.getElementById("key_offset").value = env.global_offset;
    } else { 
        document.getElementById("key_offset").value = env.fix_offset_cnt;
        var cnt = parseInt(document.getElementById("key_offset").value);
        if (cnt >= 0) {
            if (cnt > 6) cnt = 6;
            document.getElementById("key_name").innerHTML = sharp_scale_name[cnt] + "大调 <img alt=\"调号\" class=\"keysgn-img\"" + 
                                                                                              "align=\"center\" " + 
                                                                                              "src=\"./keysignature/" + cnt + ".png\"" + 
                                                                                         ">";
        } else if (cnt < 0) {
            if (cnt < -6) cnt = -6;
            document.getElementById("key_name").innerHTML = flat_scale_name[-cnt] + "大调 <img alt=\"调号\" class=\"keysgn-img\"" + 
                                                                                              "align=\"center\" " + 
                                                                                              "src=\"./keysignature/" + cnt + ".png\"" + 
                                                                                         ">";
        } else {
        }
    }
    document.getElementById("time_sign1").value = env.time1;
    document.getElementById("time_sign2").value = env.time2;
}
function init_inputs() {
    document.getElementById("song-name").value = "无题";
    document.getElementById("input").value = "在这里输入谱子，记谱方法可以看看教程\n\n点击右侧预设的谱子可以直接开始玩";
    document.getElementById("input2").value = "副音轨与主音轨同时播放，但不会生成音游谱面\n（默认比主音轨低一个八度）";
}
function init_option() {
    env.offset_option = 0;
    env.velocity = 4;
    env.global_offset = 0;
    env.set_fixed_offset(0);
}
function init_environment() {
    init_option();
    env.bpm = 90;
    env.time1 = 4, env.time2 = 4;
}

let input_loaded = 0;
function extract(tape) {
    console.log("------- start extracting -------");
    console.log(`origin: \n ${tape} \n`);
    var ext = "";
    for (var i = 0; i < tape.length; i++) {
        switch (tape[i]) {
            case '#':
                while (i < tape.length && tape[i] != '\n' && tape[i] != '\r') {
                    i++;
                }
                break;
            default: 
                if (all_keys.indexOf(tape[i]) != -1) {
                    ext += tape[i];
                }
                break;
        }
    }
    return ext;
}
function decompress(sheet) {
    //TODO
    return sheet;
}
let temp_pedal = 0, pedal = 0;
let lasting = [];
function after_load() {
    loading = 0;
    const status_element = document.getElementById("status");
    //status_element.parentNode.removeChild(status_element);
    status_element.style.color = "green";
    status_element.innerHTML = "准备就绪";
    const hovers = document.getElementsByClassName("hvinfo");
    for (var i = 0; i < hovers.length; i++) {
        hovers[i].style.display = "none";
    }
    if (localStorage.getItem('raw_main') != undefined) {
        load_inputs();
    } else {
        init_inputs();
    }
    refresh();

    const key_buttons = document.getElementsByClassName("kb-img");
    for (var i = 0; i < key_buttons.length; i++) {
        key_buttons[i].addEventListener('mousedown', function() {
            var key_code = this.id.charCodeAt("key".length);
            notepress(key_code, key2note[key_code], env.velocity);
        });
        key_buttons[i].addEventListener('mouseenter', function() {
            mouseenter(this.parentNode);
        });
        key_buttons[i].addEventListener('mouseleave', function() {
            mouseleave(this.parentNode);
        });
    }
    document.addEventListener("keydown", function(event) {
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }
        var key = event.key.toUpperCase();
        var code = key.charCodeAt();
        console.log(`${key} ${code} down`);
        switch (key) {
            case '-':
                if (env.velocity > 0) env.velocity--; 
                refresh();
                break;

            case '=':
            case '+':
                if (env.velocity < 9) env.velocity++;
                refresh();
                break;

            case ' ':
                if(event.target == document.body) {
                    event.preventDefault();
                }
                for (let i = 0; i < lasting.length; i++) {
                    notestop(lasting[i]);
                }
                lasting.length = 0;
                break;

            default:
                if (keys.indexOf(key) != -1) {
                    if (event.repeat) {
                        return;
                    }
                    const note = key2note[code];
                    notedown(
                        code, 
                        note + env.global_offset + env.fixed_offset[note % 12], 
                        env.velocity
                    );
                }
                break;
        }
    });
    document.addEventListener("keyup", function(event) {
        var key = event.key;
        var code = key.toUpperCase().charCodeAt();
        console.log(`${key} ${code} up`);
        switch (event.key) {
            case 'Shift':
                for (let i = 0; i < lasting.length; i++) {
                    notestop(lasting[i]);
                }
                lasting.length = 0;
                break;
            default:
                if (keys.indexOf(key) != -1) {
                    noteup(code);
                    const note = key2note[code];
                    const wrapped_note = note + env.global_offset + env.fixed_offset[note % 12];
                    lasting.push(wrapped_note);
                } else if (keys.indexOf(key.toUpperCase()) != -1) {
                    noteup(code);
                    const note = key2note[code];
                    const wrapped_note = note + env.global_offset + env.fixed_offset[note % 12];
                    notestop(wrapped_note);
                }
                break;
        }
    });
}
piano.load.then(() => {
    after_load();
});

function save_environment() {
    console.log(`saved: ${JSON.stringify(env)}`);
    localStorage.setItem('env', JSON.stringify(env));
}

function save_inputs() {
    const main = document.getElementById("input");
    const sub = document.getElementById("input2");
    const name = document.getElementById("song-name");
    localStorage.setItem('raw_main', main.value);
    localStorage.setItem('raw_sub', sub.value);
    localStorage.setItem('name', name.value);
}

function load_inputs() {
    input_loaded = 1;
    console.log("loaded previous input");
    const main = document.getElementById("input");
    const sub = document.getElementById("input2");
    const name = document.getElementById("song-name");
    main.value = localStorage.getItem('raw_main');
    sub.value = localStorage.getItem('raw_sub');
    name.value = localStorage.getItem('name');
}

function fetch_inputs() {
    let main_input = document.getElementById("input").value;
    let name = document.getElementById("song-name").value;
    let inputs = {
        name: name,
        main: extract(main_input),
        sub: decompress(extract(document.getElementById("input2").value)),
    };
    return inputs;
}
function read_option() {
    env.bpm = parseInt(document.getElementById("bpm").value);
    const selectElement = document.getElementById('offset_option');
    env.offset_option = selectElement.selectedIndex;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption.value == "flex") {
        env.global_offset = parseInt(document.getElementById("key_offset").value);
        env.set_fixed_offset(0);
    } else {
        env.global_offset = 0;
        var cnt = parseInt(document.getElementById("key_offset").value);
        env.set_fixed_offset(cnt);
        //console.log(env.fixed_offset);
    }
    env.time1 = parseInt(document.getElementById("time_sign1").value);
    env.time2 = parseInt(document.getElementById("time_sign2").value);
    refresh();
}
document.getElementById("submit").onclick = () => {
    read_option();
}
document.getElementById("stop").onclick = () => {
    console.log("stop");
    stop();
}
document.getElementById("tutorial").onclick = () => {
    if (loading) return;
    env.velocity = 4;
    init_environment();
    document.getElementById("input").value = tutorial;
    document.getElementById("song-name").value = "教程";
    refresh();
};
//document.getElementById("tutorial2").onclick = () => {
//    init();
//    document.getElementById("input2").value = tutorial2;
//    refresh();
//};
document.getElementById("sad-machine").onclick = () => {
    if (loading) return;
    env.velocity = 4;
    env.bpm = 85;
    env.time1 = 4;
    env.time2 = 4;
    env.offset_option = 1;
    env.global_offset = 0;
    env.set_fixed_offset(-3);
    document.getElementById("song-name").value = "Sad Machine";
    document.getElementById("input").value = sad_machine.main;
    document.getElementById("input2").value = sad_machine.sub;
    refresh();
    //console.log(sampler.instrumentNames);
    //context.resume();
};
document.getElementById("bwv846").onclick = () => {
    if (loading) return;
    env.velocity = 4;
    env.bpm = 70;
    env.time1 = 4;
    env.time2 = 4;
    env.global_offset = 0;
    env.offset_option = 0;
    env.set_fixed_offset(0);
    document.getElementById("song-name").value = "巴赫C大调前奏曲";
    document.getElementById("input").value = bwv846;
    document.getElementById("input2").value = "";
    refresh();
    //console.log(sampler.instrumentNames);
    //context.resume();
};
document.getElementById("haruhikage").onclick = () => {
    if (loading) return;
    env.velocity = 4;
    env.bpm = 90;
    env.time1 = 6;
    env.time2 = 8;
    env.offset_option = 0;
    env.global_offset = -1;
    env.set_fixed_offset(0);
    document.getElementById("song-name").value = "春日影";
    document.getElementById("input").value = haruhikage;
    document.getElementById("input2").value = "";
    refresh();
    //play(haruhikage);
    //console.log(sampler.instrumentNames);
    //context.resume(); // enable audio context after a user interaction
};
document.getElementById("reset").onclick = () => {
    init_environment();
    init_inputs();
    refresh();
};
document.getElementById("start").onclick = () => {
    if (loading) return;
    console.log("click");
    //getAttribute();
    read_option();
    save_inputs();
    var input = fetch_inputs();
    save_environment();
    stop();
    var env2 = { ...env };
    env2.global_offset -= 12;
    play(input.main), play(input.sub, env2);
}
function gamestart() {
    if (loading) return;
    stop();
    read_option();
    save_inputs();
    var input = fetch_inputs();
    console.log(input);
    save_environment();
    localStorage.setItem('tape', JSON.stringify(input));
    localStorage.setItem('difficulty', document.getElementById("difficulty-select").selectedIndex);
    localStorage.setItem('delay', document.getElementById("delay").value);
    window.location.href = './game.html'
}
document.getElementById("gamestart").onclick = () => {
    localStorage.setItem('is_tutorial', "0");
    gamestart();
}
document.getElementById("gamestart2").onclick = () => {
    localStorage.setItem('is_tutorial', "0");
    gamestart();
}
document.getElementById("gametutorial").onclick = () => {
    localStorage.setItem('is_tutorial', "1");
    gamestart();
}
document.getElementById("vel-add").onclick = () => {
    if (env.velocity < 9) env.velocity++;
    refresh();
}
document.getElementById("vel-minus").onclick = () => {
    if (env.velocity > 0) env.velocity--;
    refresh();
}
document.getElementById("reset-environment").onclick = () => {
    init_option();
    refresh();
}

//var str = "";
init_constants();
//console.log(str);
const key_buttons = document.getElementsByClassName("kb-img");
for (var i = 0; i < key_buttons.length; i++) {
    key_buttons[i].draggable = false; // 不可拖动
}
if (localStorage.getItem('env') != undefined) {
    let prev_env = JSON.parse(localStorage.getItem('env'));
    console.log(prev_env);
    env.velocity = prev_env.velocity;
    env.global_offset = prev_env.global_offset;
    env.bpm = prev_env.bpm;
    env.time1 = prev_env.time1, env.time2 = prev_env.time2;
    env.offset_option = prev_env.offset_option;
    env.set_fixed_offset(prev_env.fix_offset_cnt);
    console.log(env);
    document.getElementById("difficulty-select").selectedIndex = parseInt(localStorage.getItem('difficulty'));
    console.log("loaded previous environment");
} else {
    init_environment();
    document.getElementById("difficulty-select").selectedIndex = 3;
}
refresh();

