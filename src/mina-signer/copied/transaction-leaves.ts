import { Field, Bool, UInt32, UInt64, Sign } from "./field.js";
import * as Json from "./gen/transaction-json.js";
import { PublicKey } from "./curve.js";
import {
  ProvableExtended,
  dataAsHash,
  provable,
  HashInput,
} from "./provable.js";
import * as Encoding from "./encoding.js";

export {
  PublicKey,
  Field,
  Bool,
  AuthRequired,
  AuthorizationKind,
  UInt64,
  UInt32,
  Sign,
  TokenId,
};

export { Events, Events as SequenceEvents, StringWithHash, TokenSymbol };

export { TypeMap };

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};

type AuthorizationKind = { isSigned: Bool; isProved: Bool };

type TokenId = Field;

type TokenSymbol = { symbol: string; field: Field };

// to what types in the js layout are mapped
type TypeMap = {
  PublicKey: PublicKey;
  Field: Field;
  Bool: Bool;
  AuthRequired: AuthRequired;
  AuthorizationKind: AuthorizationKind;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  TokenId: TokenId;
  // builtin
  number: number;
  null: null;
  undefined: undefined;
  string: string;
};

// types that implement AsFieldAndAux, and so can be left out of the conversion maps below
// sort of a "transposed" representation

let emptyType = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: () => [],
  fromFields: () => null,
  check: () => {},
  toInput: () => ({}),
  toJSON: () => null,
};

const TokenId = {
  ...provable(Field),
  toJSON(x: TokenId): Json.TokenId {
    return Encoding.TokenId.toBase58(x);
  },
};

const TokenSymbol = {
  ...provable({ field: Field, symbol: String }),
  toInput({ field }: TokenSymbol): HashInput {
    return { packed: [{ field, bits: 48 }] };
  },
  toJSON({ symbol }: TokenSymbol) {
    return symbol;
  },
};

const AuthRequired = {
  ...provable(
    { constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool },
    {
      customObjectKeys: [
        "constant",
        "signatureNecessary",
        "signatureSufficient",
      ],
    }
  ),
  toJSON(x: AuthRequired): Json.AuthRequired {
    let c = x.constant;
    let n = x.signatureNecessary;
    let s = x.signatureSufficient;
    // prettier-ignore
    switch (`${c}${n}${s}`) {
      case '110': return 'Impossible';
      case '101': return 'None';
      case '000': return 'Proof';
      case '011': return 'Signature';
      case '001': return 'Either';
      default: throw Error('Unexpected permission');
    }
  },
};

const AuthorizationKind = {
  ...provable(
    { isSigned: Bool, isProved: Bool },
    {
      customObjectKeys: ["isSigned", "isProved"],
    }
  ),
  toJSON(x: AuthorizationKind): Json.AuthorizationKind {
    // prettier-ignore
    switch (`${x.isSigned}${x.isProved}`) {
      case '00': return 'None_given';
      case '10': return 'Signature';
      case '01': return 'Proof';
      default: throw Error('Unexpected authorization kind');
    }
  },
};

const TypeMap: {
  [K in keyof TypeMap]: ProvableExtended<TypeMap[K], Json.TypeMap[K]>;
} = {
  Field,
  Bool,
  UInt32,
  UInt64,
  Sign,
  TokenId,
  AuthRequired,
  AuthorizationKind,
  PublicKey,
  // primitive JS types
  number: {
    ...emptyType,
    toAuxiliary: (value = 0) => [value],
    toJSON: (value) => value,
    fromFields: (_, [value]) => value,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = "") => [value],
    toJSON: (value) => value,
    fromFields: (_, [value]) => value,
  },
  null: emptyType,
  undefined: {
    ...emptyType,
    fromFields: () => undefined,
  },
};

// types which got an annotation about its circuit type in Ocaml

const Events = dataAsHash({
  emptyValue: [],
  toJSON(data: Field[][]) {
    return data.map((row) => row.map((e) => e.toString()));
  },
});
const StringWithHash = dataAsHash({
  emptyValue: "",
  toJSON(data: string) {
    return data;
  },
});