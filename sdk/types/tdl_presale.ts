export type TdlPresale = typeof IDL;

export const IDL = {
  "address": "D4Yy14wWkvDBy9wq1PLwPaAvTd26tgQ8UMxq71sDjKhW",
  "metadata": {
    "name": "tdl_presale",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "TDL token presale program"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "whitelist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "state"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "tdl_vault",
          "writable": true
        },
        {
          "name": "buyer_pay_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "pay_vault",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "guard_authority",
          "signer": true,
          "optional": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "BuyArgs"
            }
          }
        }
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "state"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "docs": [
            "CHECK"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "tdl_vault",
          "writable": true
        },
        {
          "name": "buyer_tdl_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initialize_token",
      "discriminator": [
        38,
        209,
        150,
        50,
        190,
        117,
        16,
        54
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tdl_mint"
        },
        {
          "name": "pay_mint"
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "tdl_mint"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "tdl_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_authority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tdl_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "pay_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_authority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "pay_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "whitelist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "PresaleConfig"
            }
          }
        }
      ]
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "state"
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "docs": [
            "CHECK"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "buyer_pay_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "pay_vault",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "set_config",
      "discriminator": [
        108,
        158,
        154,
        175,
        212,
        98,
        52,
        66
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "whitelist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "PresaleConfig"
            }
          }
        }
      ]
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdraw_funds",
      "discriminator": [
        241,
        36,
        29,
        111,
        208,
        31,
        104,
        217
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "docs": [
            "CHECK"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "pay_vault",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw_unallocated_tdl",
      "discriminator": [
        155,
        180,
        47,
        133,
        117,
        126,
        142,
        191
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "state.tdl_mint",
                "account": "PresaleState"
              }
            ]
          }
        },
        {
          "name": "vault_authority",
          "docs": [
            "CHECK"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "tdl_vault",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "BuyerPosition",
      "discriminator": [
        232,
        163,
        167,
        95,
        170,
        210,
        214,
        83
      ]
    },
    {
      "name": "PresaleState",
      "discriminator": [
        32,
        18,
        85,
        188,
        213,
        180,
        10,
        241
      ]
    },
    {
      "name": "Whitelist",
      "discriminator": [
        204,
        176,
        52,
        79,
        146,
        121,
        54,
        247
      ]
    }
  ],
  "events": [
    {
      "name": "ConfigUpdated",
      "discriminator": [
        40,
        241,
        230,
        122,
        11,
        19,
        198,
        194
      ]
    },
    {
      "name": "FundsWithdrawn",
      "discriminator": [
        56,
        130,
        230,
        154,
        35,
        92,
        11,
        118
      ]
    },
    {
      "name": "RefundIssued",
      "discriminator": [
        249,
        16,
        159,
        159,
        93,
        186,
        145,
        206
      ]
    },
    {
      "name": "SalePaused",
      "discriminator": [
        80,
        242,
        159,
        105,
        128,
        211,
        101,
        70
      ]
    },
    {
      "name": "SaleResumed",
      "discriminator": [
        126,
        162,
        209,
        155,
        63,
        227,
        253,
        103
      ]
    },
    {
      "name": "TokensClaimed",
      "discriminator": [
        25,
        128,
        244,
        55,
        241,
        136,
        200,
        91
      ]
    },
    {
      "name": "TokensPurchased",
      "discriminator": [
        214,
        119,
        105,
        186,
        114,
        205,
        228,
        181
      ]
    },
    {
      "name": "UnallocatedWithdrawn",
      "discriminator": [
        0,
        160,
        208,
        39,
        164,
        147,
        71,
        76
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized action"
    },
    {
      "code": 6001,
      "name": "SalePaused",
      "msg": "Sale is currently paused"
    },
    {
      "code": 6002,
      "name": "AlreadyPaused",
      "msg": "Sale is already paused"
    },
    {
      "code": 6003,
      "name": "NotPaused",
      "msg": "Sale is not paused"
    },
    {
      "code": 6004,
      "name": "SaleNotStarted",
      "msg": "Sale has not started"
    },
    {
      "code": 6005,
      "name": "SaleEnded",
      "msg": "Sale has already ended"
    },
    {
      "code": 6006,
      "name": "SaleNotEnded",
      "msg": "Sale has not ended yet"
    },
    {
      "code": 6007,
      "name": "SaleInProgress",
      "msg": "Sale is currently running"
    },
    {
      "code": 6008,
      "name": "InvalidConfiguration",
      "msg": "Invalid configuration parameters"
    },
    {
      "code": 6009,
      "name": "InvalidCapConfiguration",
      "msg": "Invalid caps configuration"
    },
    {
      "code": 6010,
      "name": "InvalidSchedule",
      "msg": "Invalid schedule configuration"
    },
    {
      "code": 6011,
      "name": "InvalidPriceConfiguration",
      "msg": "Invalid price configuration"
    },
    {
      "code": 6012,
      "name": "InvalidTgeBps",
      "msg": "Invalid TGE basis points"
    },
    {
      "code": 6013,
      "name": "MathOverflow",
      "msg": "Math overflow occurred"
    },
    {
      "code": 6014,
      "name": "WalletMinNotReached",
      "msg": "Wallet minimum contribution not met"
    },
    {
      "code": 6015,
      "name": "WalletCapExceeded",
      "msg": "Wallet cap exceeded"
    },
    {
      "code": 6016,
      "name": "HardCapExceeded",
      "msg": "Hard cap exceeded"
    },
    {
      "code": 6017,
      "name": "InvalidAmount",
      "msg": "Invalid amount provided"
    },
    {
      "code": 6018,
      "name": "NotWhitelisted",
      "msg": "Buyer not whitelisted"
    },
    {
      "code": 6019,
      "name": "WhitelistDisabled",
      "msg": "Whitelist disabled"
    },
    {
      "code": 6020,
      "name": "CooldownActive",
      "msg": "Cooldown still active"
    },
    {
      "code": 6021,
      "name": "SoftCapMet",
      "msg": "Soft cap already met"
    },
    {
      "code": 6022,
      "name": "SoftCapNotMet",
      "msg": "Soft cap not met"
    },
    {
      "code": 6023,
      "name": "NothingToRefund",
      "msg": "Nothing to refund"
    },
    {
      "code": 6024,
      "name": "AlreadyRefunded",
      "msg": "Position already refunded"
    },
    {
      "code": 6025,
      "name": "NothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6026,
      "name": "InsufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6027,
      "name": "IncorrectPayMint",
      "msg": "Incorrect payment mint"
    },
    {
      "code": 6028,
      "name": "InvalidOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 6029,
      "name": "InvalidStateAccount",
      "msg": "Invalid state account provided"
    },
    {
      "code": 6030,
      "name": "InvalidWhitelistAccount",
      "msg": "Invalid whitelist account provided"
    },
    {
      "code": 6031,
      "name": "MissingPayAccount",
      "msg": "Missing buyer payment account"
    },
    {
      "code": 6032,
      "name": "MissingGuard",
      "msg": "Missing guard signer"
    },
    {
      "code": 6033,
      "name": "InvalidVaultAccount",
      "msg": "Invalid vault account provided"
    },
    {
      "code": 6034,
      "name": "InsufficientEscrowBalance",
      "msg": "Insufficient escrow balance"
    },
    {
      "code": 6035,
      "name": "SlippageExceeded",
      "msg": "Slippage exceeded allowed minimum"
    }
  ],
  "types": [
    {
      "name": "BuyArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pay_amount",
            "type": "u64"
          },
          {
            "name": "min_expected_tdl",
            "type": "u64"
          },
          {
            "name": "merkle_proof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "BuyerPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "contributed",
            "type": "u64"
          },
          {
            "name": "purchased",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "u64"
          },
          {
            "name": "last_purchase_ts",
            "type": "i64"
          },
          {
            "name": "refunded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "ConfigUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "FundsWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "PresaleConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price_numerator",
            "type": "u64"
          },
          {
            "name": "price_denominator",
            "type": "u64"
          },
          {
            "name": "soft_cap",
            "type": "u64"
          },
          {
            "name": "hard_cap",
            "type": "u64"
          },
          {
            "name": "wallet_min",
            "type": "u64"
          },
          {
            "name": "wallet_max",
            "type": "u64"
          },
          {
            "name": "start_ts",
            "type": "i64"
          },
          {
            "name": "end_ts",
            "type": "i64"
          },
          {
            "name": "tge_bps",
            "type": "u16"
          },
          {
            "name": "cliff_seconds",
            "type": "i64"
          },
          {
            "name": "vesting_seconds",
            "type": "i64"
          },
          {
            "name": "whitelist_enabled",
            "type": "bool"
          },
          {
            "name": "whitelist_root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "buy_cooldown_seconds",
            "type": "i64"
          },
          {
            "name": "guard_authority",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "PresaleState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vault_bump",
            "type": "u8"
          },
          {
            "name": "whitelist_bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "tdl_mint",
            "type": "pubkey"
          },
          {
            "name": "tdl_vault",
            "type": "pubkey"
          },
          {
            "name": "pay_mint",
            "type": "pubkey"
          },
          {
            "name": "pay_vault",
            "type": "pubkey"
          },
          {
            "name": "pay_mint_decimals",
            "type": "u8"
          },
          {
            "name": "price_numerator",
            "type": "u64"
          },
          {
            "name": "price_denominator",
            "type": "u64"
          },
          {
            "name": "soft_cap",
            "type": "u64"
          },
          {
            "name": "hard_cap",
            "type": "u64"
          },
          {
            "name": "wallet_min",
            "type": "u64"
          },
          {
            "name": "wallet_max",
            "type": "u64"
          },
          {
            "name": "start_ts",
            "type": "i64"
          },
          {
            "name": "end_ts",
            "type": "i64"
          },
          {
            "name": "tge_bps",
            "type": "u16"
          },
          {
            "name": "cliff_seconds",
            "type": "i64"
          },
          {
            "name": "vesting_seconds",
            "type": "i64"
          },
          {
            "name": "buy_cooldown_seconds",
            "type": "i64"
          },
          {
            "name": "collected",
            "type": "u64"
          },
          {
            "name": "total_allocated",
            "type": "u64"
          },
          {
            "name": "total_claimed",
            "type": "u64"
          },
          {
            "name": "total_refunded",
            "type": "u64"
          },
          {
            "name": "funds_withdrawn",
            "type": "u64"
          },
          {
            "name": "whitelist_enabled",
            "type": "bool"
          },
          {
            "name": "guard_authority",
            "type": "pubkey"
          },
          {
            "name": "guard_enabled",
            "type": "bool"
          },
          {
            "name": "is_paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "RefundIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "pay_amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SalePaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SaleResumed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "TokensClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "TokensPurchased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "pay_amount",
            "type": "u64"
          },
          {
            "name": "tdl_amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "UnallocatedWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "Whitelist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "version",
            "type": "u64"
          },
          {
            "name": "last_updated",
            "type": "i64"
          }
        ]
      }
    }
  ]
} as const;
