import {chrLocation,isCalifornia,isDelaware,isVermont,isAlaska,isPennsylvania,isLouisiana,isMichigan,isHawaii,isColorado,isArkansas,isNewMexico,isIllinois,isIndiana,isAlabama,isKentucky} from './chr-location.js';
import {directoryOffer,cardPriceSummary} from './directory-offer.js';
import {initialZip,positive,validZip} from './imaging-prices.js';
export function chrListedPrice(offer,modality){
 if(offer?.mod===modality&&positive(offer.amount)!==null)return String(offer.amount);
 const line=(cardPriceSummary(directoryOffer(offer.entry))||'').split('\n').find(value=>value.startsWith(modality+':'));
 return line?.match(/\$([\d,]+(?:\.\d+)?)/)?.[1]?.replaceAll(',','')||'';
}
export function chrAvailabilityQuery(offer){
 const mri=chrListedPrice(offer,'MRI'),ct=chrListedPrice(offer,'CT');
 const state=[['CA',isCalifornia],['DE',isDelaware],['VT',isVermont],['AK',isAlaska],['PA',isPennsylvania],['LA',isLouisiana],['MI',isMichigan],['HI',isHawaii],['CO',isColorado],['AR',isArkansas],['NM',isNewMexico],['IL',isIllinois],['IN',isIndiana],['AL',isAlabama],['KY',isKentucky]].find(([,check])=>check(offer))?.[0];
 if(state)return {state,view:'hospitals',mri,ct};
 const {ohio,city,latitude,longitude}=chrLocation(offer),zip=initialZip(offer.entry);
 if(!ohio||(!validZip(zip)&&zip))return null;
 const query={zip,mri:mri||'0',ct:ct||'0',view:'filtered'};
 if(!zip){query.state='OH';query.city=city;if(latitude!==undefined&&longitude!==undefined){query.latitude=String(latitude);query.longitude=String(longitude);}}
 return query;
}
