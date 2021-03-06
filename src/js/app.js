App = {
    web3Provider: null,
    contracts: {},
    account: null,

    init: function() {
        return App.initWeb3();
    },

    initWeb3: function() {
        // If a web3 instance is already provided by Meta Mask.
        // otherwise specify default instance if no web3 instance provided
        App.web3Provider = (typeof web3 !== 'undefined') ? web3.currentProvider : new Web3.providers.HttpProvider('http://localhost:8545');
        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {
        $.getJSON("Election.json", function(election) {
            // Instantiate a new truffle contract from the artifact
            App.contracts.Election = TruffleContract(election);
            // Connect provider to interact with contract
            App.contracts.Election.setProvider(App.web3Provider);
            App.listenForEvents();
            return App.render();
        });
    },

    listenForEvents: async function() {
        const instance = await App.contracts.Election.deployed();
        instance.votedEvent({}, {
            fromBlock: 0,
            toBlock: 'latest'
        }).watch(function(error, event) {
            console.log("event triggered", event)
            // Reload when a new vote is recorded
            App.render();
        });
    },

    castVote: async function(candidateId) {
        const instance = await App.contracts.Election.deployed();
        const result = await instance.vote(candidateId, { from: App.account });
        // Wait for votes to update
        $("#content").hide();
        $("#loader").show();
    },

    render: function() {
        var loader = $("#loader");
        var content = $("#content");
        var connectButton = $('#connectButton');
        var candidatesResults = $("#candidatesResults");

        loader.show();
        content.hide();
        connectButton.hide();

        if (!App.account) {
            $("#accountAddress").hide();
            connectButton.show();
        } else {
            $("#accountAddress").html("Your Account: " + App.account);
            $("#accountAddress").show();
            connectButton.hide();
        }

        async function loadContractData() {
            candidatesResults.empty();
            getAccount();
            // Load contract data
            App.contracts.Election.deployed().then(function(instance) {
                instance.candidatesCount().then(function (candidatesCount) {
                    for (var i = 1; i <= candidatesCount; i++) {
                        instance.candidates(i).then(function(candidate) {
                            const [id, name, voteCount] = candidate;

                            // Render candidate Result
                            const voteButton = "<button class=\"voteButton\" onClick=\"App.castVote(" + id + ")\">Vote</button>";
                            const candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "&nbsp;&nbsp;&nbsp;" + voteButton + "</td>" + "</td></tr>";
                            candidatesResults.append(candidateTemplate);
                        });
                    }
                });
            })
            loader.hide();
            content.show();
        }

        loadContractData();

        connectButton[0].addEventListener('click', function () {
            getAccount();
        });

        async function getAccount() {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            App.account = account;
            $("#accountAddress").html("Your Account: " + account);
            $("#accountAddress").show();
            connectButton.hide();

            const balance = await ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] });
            $("#accountBalance").html("Your Balance: " + web3.fromWei(balance) + " ETH");
            $("#accountBalance").show();

            const instance = await App.contracts.Election.deployed();
            const hasVoted = await instance.voters(account);
            var voteButtons = $(".voteButton");
            if (hasVoted) {
                voteButtons.hide();
            } else {
                voteButtons.show();
            }
        }
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});
