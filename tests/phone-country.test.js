import {test,expect} from "vitest";
import {CALLING_CODES,phoneInput} from "../src/phone-country.js";
test("country list covers US India and shared calling codes",()=>{
 expect(CALLING_CODES.length).toBeGreaterThan(240);
 expect(CALLING_CODES.find(c=>c.country==="US").dial).toBe("1");
 expect(CALLING_CODES.find(c=>c.country==="IN").dial).toBe("91");
 expect(CALLING_CODES.find(c=>c.country==="CA").dial).toBe("1");
});
test("combines country and national digits exactly once",()=>{
 expect(phoneInput("IN","90000 00000").phone).toBe("+919000000000");
 expect(phoneInput("US","555-010-2222").phone).toBe("+15550102222");
 expect(phoneInput("IN","").phone).toBe("");
});
test("full international paste chooses matching country and strips dial code",()=>{
 expect(phoneInput("US","+91 90000 00000")).toEqual({country:"IN",national:"9000000000",phone:"+919000000000"});
 expect(phoneInput("CA","+1 555 010 2222").country).toBe("CA");
 expect(phoneInput("US","+99999999999").phone).toBe("");
});
