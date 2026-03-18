;; usdcx-token.clar
;; USDCx SIP-010 Fungible Token - Stacks Testnet
;;
;; Roles:
;;   governance (0x00) - update contracts, manage roles
;;   mint       (0x01) - mint / burn / protocol-transfer
;;   pause      (0x02) - pause / unpause
;;
;; Deploy order:
;;   1. usdcx-token.clar  (this file)
;;   2. usdcx-v1.clar     (references .usdcx-token as .usdcx)

;; Import SIP-010 trait
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; -- Error codes ---------------------------------------------------------------
(define-constant ERR_NOT_OWNER    (err u4))
(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_PAUSED       (err u401))

;; -- Token definition ----------------------------------------------------------
(define-fungible-token usdcx-token)

(define-data-var token-name   (string-ascii 32)               "USDCx")
(define-data-var token-symbol (string-ascii 10)               "USDCx")
(define-data-var token-uri    (optional (string-utf8 256))
  (some u"https://ipfs.io/ipfs/bafkreifkhq47bgrlq2z2qgtps65eawgp6xsqkwldz57y2bjpefgo5zvza4"))
(define-constant token-decimals u6)

;; -- Role constants ------------------------------------------------------------
(define-constant governance-role 0x00)
(define-constant mint-role       0x01)
(define-constant pause-role      0x02)

;; -- Protocol state ------------------------------------------------------------
(define-data-var paused bool false)

(define-map active-protocol-contracts
  { caller: principal, role: (buff 1) }
  bool
)

;; Boot: deployer gets governance; usdcx-v1 gets mint
(map-set active-protocol-contracts { caller: tx-sender, role: governance-role } true)

;; -- SIP-010 public functions --------------------------------------------------

(define-public (transfer
    (amount    uint)
    (sender    principal)
    (recipient principal)
    (memo      (optional (buff 34)))
  )
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) ERR_NOT_OWNER)
    (try! (ft-transfer? usdcx-token amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)         (ok (var-get token-name)))
(define-read-only (get-symbol)       (ok (var-get token-symbol)))
(define-read-only (get-decimals)     (ok token-decimals))
(define-read-only (get-total-supply) (ok (ft-get-supply usdcx-token)))
(define-read-only (get-token-uri)    (ok (var-get token-uri)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance usdcx-token who))
)

;; Aliases kept for compatibility with existing frontend hooks
(define-read-only (get-balance-available (who principal))
  (ok (ft-get-balance usdcx-token who))
)
;; get-balance-locked: parameter removed as unused
(define-read-only (get-balance-locked)
  (ok u0)
)

;; -- Access-control helpers -----------------------------------------------------

(define-read-only (validate-protocol-caller
    (contract-flag (buff 1))
    (contract      principal)
  )
  (begin
    (asserts!
      (default-to false
        (map-get? active-protocol-contracts { caller: contract, role: contract-flag })
      )
      ERR_UNAUTHORIZED
    )
    (ok true)
  )
)

(define-read-only (is-protocol-caller (contract-flag (buff 1)) (contract principal))
  (validate-protocol-caller contract-flag contract)
)

;; -- Pause ---------------------------------------------------------------------

(define-read-only (is-protocol-paused) (var-get paused))

(define-read-only (validate-protocol-active)
  (ok (asserts! (not (is-protocol-paused)) ERR_PAUSED))
)

(define-public (pause)
  (begin
    (try! (validate-protocol-caller pause-role contract-caller))
    (print { topic: "pause", paused: true,  caller: contract-caller })
    (ok (var-set paused true))
  )
)

(define-public (unpause)
  (begin
    (try! (validate-protocol-caller pause-role contract-caller))
    (print { topic: "pause", paused: false, caller: contract-caller })
    (ok (var-set paused false))
  )
)

;; -- Protocol functions (mint-role only) ---------------------------------------

(define-public (protocol-mint (amount uint) (recipient principal))
  (begin
    ;; #[filter(amount, recipient)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller mint-role contract-caller))
    (ft-mint? usdcx-token amount recipient)
  )
)

(define-public (protocol-burn (amount uint) (owner principal))
  (begin
    ;; #[filter(amount, owner)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller mint-role contract-caller))
    (ft-burn? usdcx-token amount owner)
  )
)

(define-public (protocol-transfer (amount uint) (sender principal) (recipient principal))
  (begin
    ;; #[filter(amount, sender, recipient)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller mint-role contract-caller))
    (ft-transfer? usdcx-token amount sender recipient)
  )
)

;; -- Batch mint (mint-role only) -----------------------------------------------

(define-private (protocol-mint-many-iter (item { amount: uint, recipient: principal }))
  ;; #[allow(unchecked_data)]
  (ft-mint? usdcx-token (get amount item) (get recipient item))
)

(define-public (protocol-mint-many
    (recipients (list 200 { amount: uint, recipient: principal }))
  )
  (begin
    ;; #[filter(recipients)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller mint-role contract-caller))
    (ok (map protocol-mint-many-iter recipients))
  )
)

;; -- Governance functions ------------------------------------------------------

(define-public (set-active-protocol-caller
    (caller  principal)
    (role    (buff 1))
    (enabled bool)
  )
  (begin
    ;; #[filter(caller, role, enabled)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller governance-role contract-caller))
    (map-set active-protocol-contracts { caller: caller, role: role } enabled)
    (ok true)
  )
)

(define-public (protocol-set-name (new-name (string-ascii 32)))
  (begin
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller governance-role contract-caller))
    (ok (var-set token-name new-name))
  )
)

(define-public (protocol-set-symbol (new-symbol (string-ascii 10)))
  (begin
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller governance-role contract-caller))
    (ok (var-set token-symbol new-symbol))
  )
)

(define-public (protocol-set-token-uri (new-uri (optional (string-utf8 256))))
  (begin
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller governance-role contract-caller))
    (ok (var-set token-uri new-uri))
  )
)

;; -- Direct mint (governance only - for testnet faucet / seeding) --------------
;;
;; Unlike protocol-mint (which requires a registered mint-role caller),
;; this function lets the governance key mint directly without deploying usdcx-v1.
;; REMOVE or restrict this in production.
(define-public (governance-mint (amount uint) (recipient principal))
  (begin
    ;; #[filter(amount, recipient)]
    (try! (validate-protocol-active))
    (try! (validate-protocol-caller governance-role contract-caller))
    (ft-mint? usdcx-token amount recipient)
  )
)
