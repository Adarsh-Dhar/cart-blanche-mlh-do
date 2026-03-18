;; usdcx-v1.clar
;; USDCx xReserve Bridge - Stacks Testnet

;; -- Error codes ---------------------------------------------------------------
(define-constant ERR_UNABLE_TO_RECOVER_PK            (err u100))
(define-constant ERR_INVALID_DEPOSIT_BYTE_LENGTH      (err u101))
(define-constant ERR_INVALID_DEPOSIT_AMOUNT_TOO_HIGH  (err u102))
(define-constant ERR_INVALID_DEPOSIT_MAX_FEE_TOO_HIGH (err u103))
(define-constant ERR_INVALID_DEPOSIT_INTENT_MAGIC     (err u104))
(define-constant ERR_INVALID_DEPOSIT_HOOK_DATA_LENGTH (err u105))
(define-constant ERR_INVALID_DEPOSIT_SIGNATURE        (err u106))
(define-constant ERR_INVALID_DEPOSIT_VERSION          (err u107))
(define-constant ERR_INVALID_DEPOSIT_AMOUNT_ZERO      (err u108))
(define-constant ERR_INVALID_DEPOSIT_FEE_AMOUNT_TOO_HIGH (err u109))
(define-constant ERR_INVALID_DEPOSIT_REMOTE_DOMAIN    (err u110))
(define-constant ERR_INVALID_DEPOSIT_REMOTE_TOKEN     (err u111))
(define-constant ERR_INVALID_DEPOSIT_REMOTE_RECIPIENT (err u112))
(define-constant ERR_INVALID_DEPOSIT_NONCE           (err u113))
(define-constant ERR_INVALID_DEPOSIT_MAX_FEE_GTE_AMOUNT (err u114))
(define-constant ERR_INVALID_DEPOSIT_REMOTE_RECIPIENT_LENGTH (err u115))
(define-constant ERR_INVALID_WITHDRAWAL_AMOUNT_TOO_LOW (err u116))
(define-constant ERR_INVALID_NATIVE_DOMAIN            (err u117))

;; -- Constants -----------------------------------------------------------------
(define-constant DEPOSIT_INTENT_MAGIC    0x5a2e0acd)
(define-constant DEPOSIT_INTENT_VERSION  u1)
(define-constant ETHEREUM_NATIVE_DOMAIN  u0)
(define-constant DOMAIN                  u10003)

;; -- Storage -------------------------------------------------------------------
(define-map used-nonces     (buff 32) bool)
(define-map circle-attestors (buff 33) bool)
(define-data-var min-withdrawal-amount uint u0)

;; -- Deposit intent parsing ----------------------------------------------------

(define-read-only (parse-deposit-intent (deposit-intent (buff 320)))
  (begin
    (asserts! (>= (len deposit-intent) u240) ERR_INVALID_DEPOSIT_BYTE_LENGTH)
    (let (
        (magic               (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u0  u4))   u4)))
        (version             (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u4  u8))   u4))))
        (amount-left-bytes   (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u8  u24))  u16)))
        (amount              (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u24 u40))  u16))))
        (remote-domain       (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u40 u44))  u4))))
        (remote-token        (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u44 u76))  u32)))
        (remote-recipient    (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u76 u108)) u32)))
        (local-token         (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u108 u140)) u32)))
        (local-depositor     (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u140 u172)) u32)))
        (max-fee-left-bytes  (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u172 u188)) u16)))
        (max-fee             (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u188 u204)) u16))))
        (nonce               (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u204 u236)) u32)))
        (hook-data-len       (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? deposit-intent u236 u240)) u4))))
      )
      (asserts! (is-eq magic DEPOSIT_INTENT_MAGIC)        ERR_INVALID_DEPOSIT_INTENT_MAGIC)
      (asserts! (is-eq amount-left-bytes  0x00000000000000000000000000000000) ERR_INVALID_DEPOSIT_AMOUNT_TOO_HIGH)
      (asserts! (is-eq max-fee-left-bytes 0x00000000000000000000000000000000) ERR_INVALID_DEPOSIT_MAX_FEE_TOO_HIGH)
      (asserts! (is-eq (len deposit-intent) (+ u240 hook-data-len))           ERR_INVALID_DEPOSIT_HOOK_DATA_LENGTH)
      (ok {
        magic:            magic,
        version:          version,
        amount:           amount,
        remote-domain:    remote-domain,
        remote-token:     remote-token,
        remote-recipient: remote-recipient,
        local-token:      local-token,
        local-depositor:  local-depositor,
        max-fee:          max-fee,
        nonce:            nonce,
        hook-data: (if (is-eq hook-data-len u0)
          0x
          (unwrap-panic (as-max-len?
            (unwrap-panic (slice? deposit-intent u240 (+ u240 hook-data-len)))
            u80
          ))
        ),
      })
    )
  )
)

(define-read-only (recover-deposit-intent-pk
    (deposit-intent (buff 320))
    (signature      (buff 65))
  )
  (let (
      (hash         (keccak256 deposit-intent))
      (recovered-pk (unwrap! (secp256k1-recover? hash signature) ERR_UNABLE_TO_RECOVER_PK))
    )
    (ok recovered-pk)
  )
)

(define-read-only (verify-deposit-intent-signature
    (deposit-intent (buff 320))
    (signature      (buff 65))
  )
  (let ((recovered-pk (try! (recover-deposit-intent-pk deposit-intent signature))))
    (asserts!
      (default-to false (map-get? circle-attestors recovered-pk))
      ERR_INVALID_DEPOSIT_SIGNATURE
    )
    (ok recovered-pk)
  )
)

(define-read-only (get-remote-recipient (remote-recipient-bytes (buff 32)))
  (let (
      (version-byte (unwrap-panic (element-at? remote-recipient-bytes u11)))
      (hash-bytes   (unwrap-panic (as-max-len? (unwrap-panic (slice? remote-recipient-bytes u12 u32)) u20)))
    )
    (asserts! (is-eq (len remote-recipient-bytes) u32) ERR_INVALID_DEPOSIT_REMOTE_RECIPIENT_LENGTH)
    (ok (unwrap! (principal-construct? version-byte hash-bytes) ERR_INVALID_DEPOSIT_REMOTE_RECIPIENT))
  )
)

(define-read-only (get-valid-remote-token)
  (concat 0x00000000
    (unwrap-panic (as-max-len? (unwrap-panic (to-consensus-buff? .usdcx-token)) u28))
  )
)

(define-read-only (parse-and-validate-deposit-intent (deposit-intent (buff 320)))
  (let (
      (parsed-intent    (try! (parse-deposit-intent deposit-intent)))
      (remote-recipient (try! (get-remote-recipient (get remote-recipient parsed-intent))))
      (amount (get amount parsed-intent))
    )
    (asserts! (is-eq (get remote-token   parsed-intent) (get-valid-remote-token)) ERR_INVALID_DEPOSIT_REMOTE_TOKEN)
    (asserts! (> amount u0)                                                         ERR_INVALID_DEPOSIT_AMOUNT_ZERO)
    (asserts! (is-eq (get remote-domain  parsed-intent) DOMAIN)                     ERR_INVALID_DEPOSIT_REMOTE_DOMAIN)
    (asserts! (is-eq (get version        parsed-intent) DEPOSIT_INTENT_VERSION)     ERR_INVALID_DEPOSIT_VERSION)
    (asserts! (>= amount (get max-fee    parsed-intent))                            ERR_INVALID_DEPOSIT_MAX_FEE_GTE_AMOUNT)
    (asserts! (is-none (map-get? used-nonces (get nonce parsed-intent)))            ERR_INVALID_DEPOSIT_NONCE)
    (ok (merge parsed-intent { remote-recipient: remote-recipient }))
  )
)

;; -- Mint ----------------------------------------------------------------------

(define-public (mint
    (deposit-intent (buff 320))
    (signature      (buff 65))
    (fee-amount     uint)
  )
  (let (
      (parsed-intent (try! (parse-and-validate-deposit-intent deposit-intent)))
      (recovered-pk  (try! (verify-deposit-intent-signature deposit-intent signature)))
      (mint-amount   (- (get amount parsed-intent) fee-amount))
    )
    (asserts! (>= (get max-fee parsed-intent) fee-amount) ERR_INVALID_DEPOSIT_FEE_AMOUNT_TOO_HIGH)
    (if (is-eq mint-amount u0)
      true
      (try! (contract-call? .usdcx-token protocol-mint mint-amount (get remote-recipient parsed-intent)))
    )
    (if (is-eq fee-amount u0)
      true
      (try! (contract-call? .usdcx-token protocol-mint fee-amount tx-sender))
    )
    (map-set used-nonces (get nonce parsed-intent) true)
    (print {
      topic:          "mint",
      parsed-intent:  parsed-intent,
      attestor-pk:    recovered-pk,
      mint-amount:    mint-amount,
      fee-amount:     fee-amount,
    })
    (ok true)
  )
)

;; -- Burn (withdrawal) ---------------------------------------------------------

(define-public (burn
    (amount           uint)
    (native-domain    uint)
    (native-recipient (buff 32))
  )
  (begin
    (asserts! (>= amount (var-get min-withdrawal-amount)) ERR_INVALID_WITHDRAWAL_AMOUNT_TOO_LOW)
    (asserts! (is-eq native-domain ETHEREUM_NATIVE_DOMAIN) ERR_INVALID_NATIVE_DOMAIN)
    (try! (contract-call? .usdcx-token protocol-burn amount tx-sender))
    (print {
      topic:            "burn",
      native-domain:    native-domain,
      native-recipient: native-recipient,
      sender:           tx-sender,
      amount:           amount,
    })
    (ok true)
  )
)

;; -- Governance ----------------------------------------------------------------

(define-public (add-or-remove-circle-attestor (public-key (buff 33)) (enabled bool))
  (begin
    (try! (contract-call? .usdcx-token validate-protocol-caller 0x00 contract-caller))
    (map-set circle-attestors public-key enabled)
    (ok true)
  )
)

(define-public (set-min-withdrawal-amount (new-min uint))
  (begin
    (try! (contract-call? .usdcx-token validate-protocol-caller 0x04 contract-caller))
    (var-set min-withdrawal-amount new-min)
    (ok true)
  )
)

(define-read-only (get-min-withdrawal-amount)
  (var-get min-withdrawal-amount)
)