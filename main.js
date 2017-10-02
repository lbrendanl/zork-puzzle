$(document).ready(function($) {
    const devPortalURL = "http://developers.tableau.com";
    const puzzleHuntUrl = "https://tc17.tableau.com/puzzle-hunt";
    const tc17ContentURL = "https://www.tableau.com"; //TODO URL
    const zork = "frobozz/frobozz.html"

    let logo = ""
    logo += "          _|_          \n";
    logo += "     #     |     #     \n";
    logo += "   #####       #####   \n";
    logo += "     #     #     #           _             _       _                        \n";
    logo += "_|_        #        _|_     | |_    __ _  | |__   | |   ___    __ _   _   _ \n";
    logo += " |      #######      |      | __|  / _` | | '_ \\  | |  / _ \\  / _` | | | | |\n";
    logo += "           #                | |_  | (_| | | |_ |  | | |  __/ | (_| | | |_| |\n";
    logo += "     #     #     #           \\__|  \\__,_| |_.__/  |_|  \\___|  \\__,_|  \\__,_|\n";
    logo += "   #####       #####   \n";
    logo += "     #    _|_    #     \n";
    logo += "           |           \n";
    logo += "\n";

    let welcomeMessage = "";
    welcomeMessage += "Welcome to the #DataDev browser CLI.\n";
    welcomeMessage += "This is a simple CLI for engaging with Tableau's dev tools and content.\n";
    welcomeMessage += "This tool is also available via npm and pip (datadev).\n\n";
    welcomeMessage += "Use help to see available commands.\n\n";

    let helpMessage = "\n";
    helpMessage += "Available commands are:\n\n";
    helpMessage += "datadev   launches the Tableau developer portal.\n";
    helpMessage += "tc17      takes you to all developer track content for TC17.\n";
    helpMessage += "hunt      did someone say puzzles?\n";
    helpMessage += "clear     clears terminal.\n";
    helpMessage += "help      displays this message.\n";
    
    $("body").terminal(function(command, term) {
        switch (command) {
            case "datadev":
                term.echo("Launching developer portal in a new window...\n");
                window.open(devPortalURL);
                break;
            case "tc17":
                term.echo("Taking you to the developer track content in a new window...\n");            
                window.open(tc17ContentURL);
                break;
            case "hunt":
                term.echo("Launching Puzzle Hunt info in a new window...\n");
                window.open(puzzleHuntUrl);
                break;
            case "clear":
                term.clear();
                break;
            case "help":
                term.echo(helpMessage);
                break;
            // Hidden Commands
            case "drinkme":
                // Just an easter egg callback to last year, not related to puzzle hunt.
                term.echo("Nice try! Your puzzling adventure begins elsewhere this year...\n");
                break;
            case "eggshell":
                term.echo("......\n\n");
                setTimeout(() => {
                    term.echo("Initializing failsafe challenge...\n\n");
                    setTimeout(() => {
                        term.echo("Player one prepare...\n\n")
                        setTimeout(() => { window.location.href = zork; }, 2000);
                    }, 2000);
                }, 2000);
                
                break;
            default:
                term.echo("Invalid command");
                term.echo(helpMessage);            
        }
    }, {
        greetings: "",
        onBlur: function() {
            // prevent losing focus
            return false;
        },
        onClear: function() {
            this.echo(logo, {finalize: function(div) {
                div.css("color", "orange");
            }});
            this.echo(welcomeMessage);
        },
        onInit: function() {
            this.echo(logo, {finalize: function(div) {
                div.css("color", "orange");
            }});
            this.echo(welcomeMessage);
        }
    });
});
