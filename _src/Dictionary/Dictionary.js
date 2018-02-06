/*
Design specification: see Dictionary.spec.md.
*/

import {callAsync} from './helpers/async';
import {zPropPrune} from './helpers/arrayQuery';
import numberStringToExponential from './helpers/numToExp';
import {undef, deepClone, strcmp, asArray} from './helpers/util';

const todoStr = 'to implement by a subclass';


export default class Dictionary {

  constructor(options) {
    var opt = options || {};
    this.numberMatchConfig = !undef(opt.numberMatchConfig) ?  // false==deactiv.
      opt.numberMatchConfig :
      { dictID         : '00',
        conceptIDPrefix: '00:',
      };

    this.fixedTermsCache = {};
  }


  // Fetches match-objects for fixedTerms, i.e for a conceptID + optional term,
  // and stores them in `this.fixedTermsCache`, accessible via a lookup key.
  loadFixedTerms(idts, options, cb) {
    idts = this._prepIdts(idts);

    // Prevent unfiltered query; (`opt.filter.i=[]` would request all entries).
    if (!idts.length)  return callAsync(cb, null);

    var opt = options ? deepClone(options) : {};
    if (!opt.filter)  opt.filter = {};
    opt.filter.i = idts.map(x => x.i);  // Query `getEntries()` for idts's IDs.
    opt.page     = 1;
    opt.perPage  = idts.length;  // Ensure the response isn't paginated.

    this.getEntries(opt, (err, res) => {
      if (err)  return callAsync(cb, err);

      // For each given id(+str), find the matching entry in the returned `res`.
      idts.forEach(x => {
        var e = res.items.find(e => e.i == x.i);
        if (!e)  return;  // Don't add a key+value if no entry was found for it.

        var p = e.t.findIndex(t => t.s == x.s);  // Find term-string's position.
        if (p == -1)  p = 0; // Use term 1 if entry doesn't have the given term.

        var k = this._idtToFTCacheKey(x.i, x.s || '');
        this.fixedTermsCache[k] = this._entryToMatch(e, p, 'F');
      });

      callAsync(cb, null);
    });
  }


  // Brings a conceptID-and-optional-termStrings array into canonical form,
  // e.g. `['id', ...]` --> `[{i:'id', s:..}, ...]`.
  _prepIdts(idts) {
    return asArray(idts).map(x => !x.i ? {i: x} : x);
  }


  // Given a fixedTerm's conceptID plus (optionally) a term-string, calculates
  // the key in `fixedTermsCache` that a match-object for that pair should get.
  _idtToFTCacheKey(conceptID, termStr = '') {
    return `${conceptID}\n${termStr}`;
  }


  // Builds a match-object, based on an entry and one of its terms.
  _entryToMatch(entry, termPos, matchType) {
    return Object.assign({}, entry, entry.t[termPos], {w: matchType});
  }


  // Gets possible fixedTerm- and numberString match-objects for `str`, and
  // merges them into an array of normal matches, coming from a subclass's
  // `getMatchesForString()` (which calls this function).
  // Only has an effect for result-page 1.
  addExtraMatchesForString(str, arr, opt, cb) {
    // If the requested page > 1, add no matches.
    if (opt && (opt.page || 1) > 1)  return callAsync(cb, null, arr);
    arr = arr.slice(0);  // Duplicate before editing.

    var res = this._getFTMatchesForString(str, opt);

    if (res.length) {
      // Merge after one possible 'R'-type match, and before all others.
      var m = (arr[0]  &&  arr[0].w == 'R') ? arr.shift() : false;
      arr = res.concat(arr);
      if (m)  arr.unshift(m);

      // De-duplicate.
      arr = arr.reduce((a, m1, i1) => {
        var i2 = arr.findIndex(m2 => m1.i == m2.i  &&  m1.s == m2.s);
        if (i1 == i2) a.push(m1);
        return a;
      }, []);
    }

    var m = this._getNumberMatchForString(str);
    if (m) {
      // De-duplicate, then add.
      var j = arr.findIndex(e => e.i == m.i);
      if(j >= 0)  m = arr.splice(j, 1)[0];  // We'll use dict's match instead.
      arr.unshift(m);  // A number-string match is placed first.
      m.w = 'N';
    }
    callAsync(cb, null, arr);
  }


  // Searches `str` in `options.idts`'s linked fixedTerms's strings,
  // and (synchronously) returns newly constructed match-objects,
  // sorted and (extra) z-pruned.
  _getFTMatchesForString(str, opt) {
    // If no FT-lookup is requested, return no matches.
    if (!opt || !opt.idts)  return [];

    var arr = [];
    var str = str.toLowerCase();
    arr = this._prepIdts(opt.idts)
      .reduce((arr, x) => {
        // First map the id+strs onto match-objects, which may hold updated
        // term-strings, i.e. ones that may have been mapped on a first-term.
        var k = this._idtToFTCacheKey(x.i, x.s || '');
        var m = this.fixedTermsCache[k];
        if (!m)  return arr;  // Drop id+strs that have no match in the cache.

        var w = m.s.toLowerCase().startsWith(str) ? 'F' :
                m.s.toLowerCase().includes  (str) ? 'G' : 0;

        if (w)  arr.push( Object.assign( deepClone(m), {w} ) );
        return arr;
      }, arr);

    arr = arr.sort((a, b) =>
      strcmp(a.w, b.w) || strcmp(a.s, b.s) || strcmp(a.d, b.d) || a.i - b.i
    );

    return zPropPrune(arr, opt.z);
  }


  // If `str` represents a number, then creates a 'number-matchObject',
  // with as conceptID a canonicalized ID based on the number's value.
  _getNumberMatchForString(str) {
    if (!this.numberMatchConfig || !str)  return false;

    var id = numberStringToExponential(str);
    if (id === false)  return false;

    return {
      i: this.numberMatchConfig.conceptIDPrefix + id,
      d: this.numberMatchConfig.dictID,
      s: str,
      x: '[number]',
      w: 'N'
    };
  }


  addDictInfos(dictInfos, cb) { cb(todoStr); }

  addEntries(entries, cb) { cb(todoStr); }

  addRefTerms(refTerms, cb) { cb(todoStr); }


  updateDictInfos(dictInfos, cb) { cb(todoStr); }

  updateEntries(entries, cb) { cb(todoStr); }


  deleteDictInfos(dictIDs, cb) { cb(todoStr); }

  deleteEntries(conceptIDs, cb) { cb(todoStr); }

  deleteRefTerms(refTerms, cb) { cb(todoStr); }


  getDictInfos(options, cb) { cb(todoStr); }

  getEntries(options, cb) { cb(todoStr); }

  getRefTerms(cb) { cb(todoStr); }


  getMatchesForString(str, options, cb) { cb(todoStr); }

}
