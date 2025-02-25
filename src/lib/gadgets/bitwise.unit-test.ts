import { ZkProgram } from '../proof_system.js';
import {
  equivalentProvable as equivalent,
  equivalentAsync,
  field,
  fieldWithRng,
} from '../testing/equivalent.js';
import { Fp, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../core.js';
import { Gadgets } from './gadgets.js';
import { Random } from '../testing/property.js';
import {
  constraintSystem,
  contains,
  equals,
  ifNotAllConstant,
  repeat,
  and,
  withoutGenerics,
} from '../testing/constraint-system.js';
import { GateType } from '../../snarky.js';

const maybeField = {
  ...field,
  rng: Random.map(Random.oneOf(Random.field, Random.field.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

let uint = (length: number) => fieldWithRng(Random.biguint(length));

let Bitwise = ZkProgram({
  name: 'bitwise',
  publicOutput: Field,
  methods: {
    xor: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.xor(a, b, 254);
      },
    },
    notUnchecked: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.not(a, 254, false);
      },
    },
    notChecked: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.not(a, 254, true);
      },
    },
    and: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.and(a, b, 64);
      },
    },
    rot: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.rotate(a, 12, 'left');
      },
    },
    leftShift: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.leftShift(a, 12);
      },
    },
    rightShift: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.rightShift(a, 12);
      },
    },
  },
});

await Bitwise.compile();

[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x ^ y,
    (x, y) => Gadgets.xor(x, y, length)
  );
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x & y,
    (x, y) => Gadgets.and(x, y, length)
  );
  // NOT unchecked
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.not(x, length),
    (x) => Gadgets.not(x, length, false)
  );
  // NOT checked
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.not(x, length),
    (x) => Gadgets.not(x, length, true)
  );
});

[2, 4, 8, 16, 32, 64].forEach((length) => {
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rot(x, 12n, 'left'),
    (x) => Gadgets.rotate(x, 12, 'left')
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.leftShift(x, 12),
    (x) => Gadgets.leftShift(x, 12)
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rightShift(x, 12),
    (x) => Gadgets.rightShift(x, 12)
  );
});

await equivalentAsync({ from: [uint(64), uint(64)], to: field }, { runs: 3 })(
  (x, y) => {
    return x ^ y;
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [maybeField], to: field }, { runs: 3 })(
  (x) => {
    return Fp.not(x, 254);
  },
  async (x) => {
    let proof = await Bitwise.notUnchecked(x);
    return proof.publicOutput;
  }
);
await equivalentAsync({ from: [maybeField], to: field }, { runs: 3 })(
  (x) => {
    if (x > 2n ** 254n) throw Error('Does not fit into 254 bit');
    return Fp.not(x, 254);
  },
  async (x) => {
    let proof = await Bitwise.notChecked(x);
    return proof.publicOutput;
  }
);

await equivalentAsync(
  { from: [maybeField, maybeField], to: field },
  { runs: 3 }
)(
  (x, y) => {
    if (x >= 2n ** 64n || y >= 2n ** 64n)
      throw Error('Does not fit into 64 bits');
    return x & y;
  },
  async (x, y) => {
    let proof = await Bitwise.and(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.rot(x, 12n, 'left');
  },
  async (x) => {
    let proof = await Bitwise.rot(x);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.leftShift(x, 12);
  },
  async (x) => {
    let proof = await Bitwise.leftShift(x);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.rightShift(x, 12);
  },
  async (x) => {
    let proof = await Bitwise.rightShift(x);
    return proof.publicOutput;
  }
);

// check that gate chains stay intact

function xorChain(bits: number) {
  return repeat(Math.ceil(bits / 16), 'Xor16').concat('Zero');
}

constraintSystem.fromZkProgram(
  Bitwise,
  'xor',
  ifNotAllConstant(contains(xorChain(254)))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'notChecked',
  ifNotAllConstant(contains(xorChain(254)))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'notUnchecked',
  ifNotAllConstant(contains('Generic'))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'and',
  ifNotAllConstant(contains(xorChain(64)))
);

let rotChain: GateType[] = ['Rot64', 'RangeCheck0'];
let isJustRotate = ifNotAllConstant(
  and(contains(rotChain), withoutGenerics(equals(rotChain)))
);

constraintSystem.fromZkProgram(Bitwise, 'rot', isJustRotate);
constraintSystem.fromZkProgram(Bitwise, 'leftShift', isJustRotate);
constraintSystem.fromZkProgram(Bitwise, 'rightShift', isJustRotate);
